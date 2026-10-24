import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    BatchGetCommand,
    DynamoDBDocumentClient,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
    isPubliclyListed,
    PUBLIC_GSI_INDEX_NAME,
    PUBLIC_STUDYSET_PK,
} from 'resources/dynamo/publicSharing';
import {
    compareEntries,
    CursorPosition,
    decodeCursor,
    encodeCursor,
    FeedEntry,
    filterKey,
    paginate,
    parseExploreQuery,
    toFeedEntry,
} from 'utilities/exploreFeed';
import { logRequest } from 'utilities/logging';

const { mainTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CACHE_TTL_MS = 60_000;
// Same safety cap as the sitemap list. Past it the feed is sorted from
// whichever rows were read first (the index is ordered by uuid), so the
// warning below is the signal to move to a real index (#123).
const MAX_ITEMS = 5000;
const SLOW_REFRESH_MS = 1000;
const WARN_QUERY_PAGES = 5;
const BATCH_GET_RETRIES = 2;
const BATCH_GET_BACKOFF_MS = 50;
// A failed refresh serves the previous feed for at most this long.
const STALE_MAX_MS = 15 * 60_000;
// After a failed refresh, serve stale this long before trying again, so a
// throttled index isn't hit by every request.
const REFRESH_RETRY_MS = 10_000;

// A Lambda instance serves one request at a time, so a refresh never races
// another refresh on the same instance and needs no in-flight dedupe.
let cache: { entries: FeedEntry[]; loadedAt: number; truncated: boolean } | undefined;
let refreshRetryAt = 0;

// Test seam: jest.resetModules would break the prototype spy the lambda tests use.
export const resetExploreCache = () => {
    cache = undefined;
    refreshRetryAt = 0;
};

const refreshEntries = async (now: number) => {
    const started = Date.now();
    const entries: FeedEntry[] = [];
    let pages = 0;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    // Whole Query pages only, like the sitemap loop: never trim mid-page, so
    // `truncated` is true exactly when unread rows remain.
    do {
        const result = await docClient.send(
            new QueryCommand({
                TableName: mainTable,
                IndexName: PUBLIC_GSI_INDEX_NAME,
                KeyConditionExpression: 'PK2 = :pk',
                ExpressionAttributeValues: { ':pk': PUBLIC_STUDYSET_PK },
                ProjectionExpression:
                    'PK, SK, SK2, studysetUUID, #title, #description, #subject, #cards, #username, #publishedAt, #updatedAt, #metadata.#publiclyViewable, #moderation.#hiddenAt',
                ExpressionAttributeNames: {
                    '#title': 'title',
                    '#description': 'description',
                    '#subject': 'subject',
                    '#cards': 'cards',
                    '#username': 'username',
                    '#publishedAt': 'publishedAt',
                    '#updatedAt': 'updatedAt',
                    '#metadata': 'metadata',
                    '#publiclyViewable': 'publiclyViewable',
                    '#moderation': 'moderation',
                    '#hiddenAt': 'hiddenAt',
                },
                ExclusiveStartKey: lastEvaluatedKey,
            })
        );
        pages += 1;

        for (const item of result.Items ?? []) {
            const entry = toFeedEntry(item);
            if (entry) entries.push(entry);
        }

        lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey && entries.length < MAX_ITEMS);

    entries.sort(compareEntries);

    const durationMs = Date.now() - started;
    const truncated = !!lastEvaluatedKey;
    if (truncated || durationMs > SLOW_REFRESH_MS || pages > WARN_QUERY_PAGES) {
        console.warn(
            JSON.stringify({
                kind: 'exploreFeedRefresh',
                items: entries.length,
                pages,
                durationMs,
                truncated,
            })
        );
    }

    cache = { entries, loadedAt: now, truncated };
    return cache;
};

// AWS SDK errors carry `$metadata` (requestId, httpStatusCode) for correlating
// with CloudWatch.
const describeError = (error: unknown) =>
    error instanceof Error
        ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              $metadata: (error as { $metadata?: unknown }).$metadata,
          }
        : { message: String(error) };

const loadEntries = async (now: number) => {
    if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache;
    const stale = cache && now - cache.loadedAt <= STALE_MAX_MS ? cache : undefined;
    if (stale && now < refreshRetryAt) return stale;
    try {
        return await refreshEntries(now);
    } catch (error) {
        if (!stale) throw error;
        // Safe to serve stale: every page is rechecked before it's sent.
        // Logged as an error, not a warning, so a broken deploy still alarms
        // while users get the previous feed.
        refreshRetryAt = now + REFRESH_RETRY_MS;
        console.error(
            JSON.stringify({
                kind: 'exploreFeedRefreshFailed',
                staleMs: now - stale.loadedAt,
                error: describeError(error),
            })
        );
        return stale;
    }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const keyId = (key: { PK?: unknown; SK?: unknown }) => `${key.PK}|${key.SK}`;

/**
 * Rereads the page's rows so a set hidden or unpublished since the cache
 * filled drops out of this response, not only at the next refresh. Rows that
 * are gone or no longer listed are evicted from the cache too. Keys DynamoDB
 * still couldn't process after the retries are left out of this response only
 * (fail closed) and stay cached, so throttling doesn't hide a valid set.
 */
const recheckListed = async (page: FeedEntry[]): Promise<FeedEntry[]> => {
    if (page.length === 0) return page;

    const rows = new Map<string, Record<string, unknown>>();
    let keys: Record<string, unknown>[] = page.map((entry) => entry.key);

    for (let attempt = 0; attempt <= BATCH_GET_RETRIES && keys.length > 0; attempt += 1) {
        // Exponential backoff with jitter: an immediate retry against a
        // throttled table is throttled again.
        if (attempt > 0) {
            await sleep(BATCH_GET_BACKOFF_MS * 2 ** (attempt - 1) * (0.5 + Math.random() / 2));
        }
        const result = await docClient.send(
            new BatchGetCommand({
                RequestItems: {
                    [mainTable]: {
                        Keys: keys,
                        ProjectionExpression:
                            'PK, SK, SK2, #metadata.#publiclyViewable, #moderation.#hiddenAt',
                        ExpressionAttributeNames: {
                            '#metadata': 'metadata',
                            '#publiclyViewable': 'publiclyViewable',
                            '#moderation': 'moderation',
                            '#hiddenAt': 'hiddenAt',
                        },
                    },
                },
            })
        );
        for (const row of result.Responses?.[mainTable] ?? []) {
            rows.set(keyId(row), row);
        }
        keys = result.UnprocessedKeys?.[mainTable]?.Keys ?? [];
    }

    // Checked before "missing": DynamoDB leaves unprocessed keys out of Responses.
    const unprocessed = new Set(keys.map(keyId));
    if (unprocessed.size > 0) {
        console.warn(
            JSON.stringify({ kind: 'exploreFeedRecheckUnprocessed', count: unprocessed.size })
        );
    }

    const unlisted = new Set<FeedEntry>();
    const kept = page.filter((entry) => {
        const id = keyId(entry.key);
        if (unprocessed.has(id)) return false;
        if (!isPubliclyListed(rows.get(id))) {
            unlisted.add(entry);
            return false;
        }
        return true;
    });

    if (cache && unlisted.size > 0) {
        cache.entries = cache.entries.filter((entry) => !unlisted.has(entry));
    }
    return kept;
};

/**
 * Unauthenticated Community feed for Explore (#135): public sets, newest
 * first, paged with an opaque keyset cursor tied to the filters. Reads the
 * public index into a 60s module cache and rechecks each served page, so the
 * response itself is `no-cache`.
 */
export const handler: Handler = async (
    event: APIGatewayProxyEventV2,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const query = parseExploreQuery(event.queryStringParameters);
    if (!query.ok) {
        return { statusCode: 400, body: JSON.stringify({ message: query.message }) };
    }

    const key = filterKey(query.filters);
    let after: CursorPosition | undefined;
    if (query.cursor) {
        const decoded = decodeCursor(query.cursor, key);
        if (!decoded.ok) {
            const message =
                decoded.reason === 'filterMismatch'
                    ? 'Invalid cursor for these filters'
                    : 'Invalid cursor';
            return { statusCode: 400, body: JSON.stringify({ message }) };
        }
        after = decoded.position;
    }

    try {
        const { entries } = await loadEntries(Date.now());
        // `next` comes from the page before the recheck, so dropped rows never
        // shift the keyset.
        const { page, next } = paginate(entries, { after, limit: query.limit });
        const items = (await recheckListed(page)).map((entry) => entry.summary);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({
                items,
                nextCursor: next ? encodeCursor(next, key) : null,
                // A capped read has no true total; the web then shows "Showing X".
                ...(cache && !cache.truncated ? { total: cache.entries.length } : {}),
            }),
        };
    } catch (error) {
        console.error(
            JSON.stringify({ kind: 'exploreFeedFailed', error: describeError(error) })
        );
        // A public route: table, index and IAM details stay in the logs.
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to load the feed' }),
        };
    }
};
