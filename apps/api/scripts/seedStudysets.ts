/**
 * Seed Explore with the starter sets in scripts/seed/sets/*.json (#123): each
 * file becomes a study set owned by USER_UUID and published under that
 * account's username, the same way the publish lambda does it.
 *
 * Every file is validated against the publish gate before anything is
 * written. Set ids are derived from the owner and the file's slug, and a set
 * that already exists is skipped untouched, so a rerun only adds new files and
 * never republishes a set its owner has since edited or unpublished.
 *
 * publishedAt is staggered a minute apart in slug order (first slug newest),
 * so the Community feed shows the sets in a stable order. Slugs listed in
 * FEATURE are then featured, newest first in the order given.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   MAIN_TABLE=quizaroni-<deploymentType>-main AWS_REGION=us-west-2 \
 *     USER_UUID=<owner> [FEATURE=slug-a,slug-b] \
 *     pnpm --filter @quizaroni/api seed:studysets
 *   # add DRY_RUN=1 to only report what would change.
 */
import { createHash, randomUUID } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { SubjectId } from '@quizaroni/shared-types';
import type { Card } from 'models/studysets';
import { defaultStudysetMetadata } from '../utilities/defaultMetadata';
import { buildPublishUpdate, validatePublishRequest } from '../utilities/publishStudyset';
import { isDryRun } from './dryRun';
import { featureStudyset } from './featureStudyset';

export const SEED_DIR = join(__dirname, 'seed', 'sets');

export type SeedSet = {
    slug: string;
    title: string;
    description: string;
    subject: SubjectId;
    cards: { term: string; definition: string }[];
};

type SeedConfig = {
    tableName: string;
    userUUID: string;
    feature: string[];
    dryRun: boolean;
};

export const readSeedConfig = (env: NodeJS.ProcessEnv): SeedConfig => {
    const tableName = env.MAIN_TABLE ?? '';
    if (!tableName) {
        throw new Error('Set MAIN_TABLE to the target table name, e.g. quizaroni-production-main');
    }
    const userUUID = env.USER_UUID ?? '';
    if (!userUUID) {
        throw new Error('Set USER_UUID to the Logto user id of the account that will own the sets');
    }
    const feature = (env.FEATURE ?? '')
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean);
    return { tableName, userUUID, feature, dryRun: isDryRun(env.DRY_RUN) };
};

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim() !== '';

/** Checks one parsed file; returns its problems, or none if it can be seeded. */
export const validateSeedSet = (raw: unknown, fileSlug: string): string[] => {
    const set = (raw ?? {}) as Partial<Record<keyof SeedSet, unknown>>;
    const problems: string[] = [];
    if (set.slug !== fileSlug) problems.push(`slug must match the file name ("${fileSlug}")`);
    if (!isNonEmptyString(set.title)) problems.push('title is missing');
    if (!isNonEmptyString(set.description)) problems.push('description is missing');
    if (!Array.isArray(set.cards)) {
        problems.push('cards must be an array');
    } else if (
        set.cards.some((card) => !isNonEmptyString(card?.term) || !isNonEmptyString(card?.definition))
    ) {
        problems.push('every card needs a term and a definition');
    }

    const gate = validatePublishRequest({
        subject: set.subject,
        studyset: { cards: Array.isArray(set.cards) ? set.cards : [] },
        now: '',
    });
    if (!gate.ok) {
        problems.push(...gate.errors.map((error) => `publish gate: ${JSON.stringify(error)}`));
    }
    return problems;
};

export const loadSeedSets = (dir: string = SEED_DIR): SeedSet[] => {
    const files = readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .sort();
    const problems: string[] = [];
    const sets: SeedSet[] = [];
    for (const file of files) {
        const slug = file.replace(/\.json$/, '');
        let raw: unknown;
        try {
            raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        } catch (error) {
            problems.push(`${file}: ${(error as Error).message}`);
            continue;
        }
        const fileProblems = validateSeedSet(raw, slug);
        if (fileProblems.length > 0) {
            problems.push(...fileProblems.map((problem) => `${file}: ${problem}`));
        } else {
            sets.push(raw as SeedSet);
        }
    }
    if (problems.length > 0) {
        throw new Error(`Seed files failed validation:\n${problems.join('\n')}`);
    }
    if (sets.length === 0) {
        throw new Error(`No seed files found in ${dir}`);
    }
    return sets;
};

/** A UUID derived from the owner and slug, in the v5 layout, so reruns hit the same set. */
export const seedStudysetUUID = (userUUID: string, slug: string): string => {
    const bytes = createHash('sha1').update(`quizaroni-seed:${userUUID}:${slug}`).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const toCard = ({ term, definition }: SeedSet['cards'][number]): Card => ({
    cardUUID: randomUUID(),
    term: term.trim(),
    definition: definition.trim(),
    categories: [],
    files: [],
    important: false,
    notes: [],
});

/** The owner's public name, read from the row the Logto sign-up webhook writes. */
export const readOwnerUsername = async (
    docClient: DynamoDBDocumentClient,
    tableName: string,
    userUUID: string
): Promise<string> => {
    const { Item } = await docClient.send(
        new GetCommand({ TableName: tableName, Key: { PK: `user#${userUUID}`, SK: 'userData' } })
    );
    if (!Item) {
        throw new Error(`No user ${userUUID} in ${tableName}; sign the account up on this environment first`);
    }
    if (!isNonEmptyString(Item.username)) {
        throw new Error(`User ${userUUID} has no username; set one in Logto so the sets have a public author`);
    }
    return Item.username;
};

export const seedStudysets = async ({
    docClient,
    tableName,
    userUUID,
    username,
    sets,
    feature,
    now,
    dryRun,
    log = console.log,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    userUUID: string;
    username: string;
    sets: SeedSet[];
    feature: string[];
    now: Date;
    dryRun: boolean;
    log?: (message: string) => void;
}): Promise<{ created: string[]; skipped: string[] }> => {
    const slugs = new Set(sets.map((set) => set.slug));
    const unknown = feature.filter((slug) => !slugs.has(slug));
    if (unknown.length > 0) {
        throw new Error(`FEATURE names slugs with no seed file: ${unknown.join(', ')}`);
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const prefix = dryRun ? '[dry-run] would ' : '';

    for (const [index, set] of sets.entries()) {
        const studysetUUID = seedStudysetUUID(userUUID, set.slug);
        const Key = { PK: `userUUID#${userUUID}`, SK: `studyset#${studysetUUID}` };

        const { Item } = await docClient.send(
            new GetCommand({ TableName: tableName, Key, ProjectionExpression: 'PK' })
        );
        if (Item) {
            log(`skip ${set.slug} (${studysetUUID}): already exists`);
            skipped.push(set.slug);
            continue;
        }

        log(`${prefix}create and publish ${set.slug} (${studysetUUID}): ${set.cards.length} cards, ${set.subject}`);
        created.push(set.slug);
        if (dryRun) continue;

        const timestamp = now.toISOString();
        try {
            await docClient.send(
                new PutCommand({
                    TableName: tableName,
                    Item: {
                        ...Key,
                        cards: set.cards.map(toCard),
                        categories: [],
                        createdAt: timestamp,
                        description: set.description.trim(),
                        favorited: false,
                        labels: [],
                        lastViewed: timestamp,
                        metadata: defaultStudysetMetadata(),
                        updatedAt: timestamp,
                        studysetUUID,
                        title: set.title.trim(),
                        username,
                        userUUID,
                    },
                    ConditionExpression: 'attribute_not_exists(PK)',
                })
            );
        } catch (error) {
            if ((error as Error).name === 'ConditionalCheckFailedException') {
                log(`skip ${set.slug} (${studysetUUID}): created by someone else just now`);
                created.pop();
                skipped.push(set.slug);
                continue;
            }
            throw error;
        }

        await docClient.send(
            new UpdateCommand({
                TableName: tableName,
                Key,
                ...buildPublishUpdate({
                    studysetUUID,
                    subject: set.subject,
                    publishedAt: new Date(now.getTime() - index * 60_000).toISOString(),
                    username,
                    now: timestamp,
                }),
            })
        );
    }

    // Featured is ordered by featuredAt, newest first, so the first slug gets the latest time.
    for (const [index, slug] of feature.entries()) {
        const studysetUUID = seedStudysetUUID(userUUID, slug);
        const key = { PK: `userUUID#${userUUID}`, SK: `studyset#${studysetUUID}` };
        if (dryRun && created.includes(slug)) {
            log(`[dry-run] would feature ${key.PK} ${key.SK}`);
            continue;
        }
        await featureStudyset({
            docClient,
            tableName,
            key,
            clear: false,
            now: new Date(now.getTime() - index * 1000).toISOString(),
            dryRun,
            log,
        });
    }

    return { created, skipped };
};

if (require.main === module) {
    let config: SeedConfig;
    let sets: SeedSet[];
    try {
        config = readSeedConfig(process.env);
        sets = loadSeedSets();
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }

    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    readOwnerUsername(docClient, config.tableName, config.userUUID)
        .then((username) => {
            console.log(`Seeding ${sets.length} sets into ${config.tableName} as "${username}"\n`);
            return seedStudysets({ docClient, ...config, username, sets, now: new Date() });
        })
        .then(({ created, skipped }) => {
            console.log(
                `\nDone. created=${created.length} skipped=${skipped.length}${
                    config.dryRun ? ' (dry run — no writes performed)' : ''
                }`
            );
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
