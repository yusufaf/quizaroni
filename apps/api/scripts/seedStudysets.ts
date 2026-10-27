/**
 * Seed Explore with the starter sets in scripts/seed/sets/*.json (#123): each
 * file becomes a study set owned by USER_UUID and published under that
 * account's username, the same way the publish lambda does it.
 *
 * Every file is validated against the publish gate before anything is
 * written. Set ids are derived from the owner and the file's slug, so a rerun
 * reaches the same sets and only creates the ones that don't exist; an
 * existing set is never written, so its owner's edits and unpublishes stand.
 * Creating and publishing are two writes. If the publish fails, the create is
 * undone. If the run dies between them anyway, the set is left private and
 * later runs report it as incomplete rather than publish whatever the row
 * holds by then: publish or delete it in the app.
 * A seed set deleted in the app has no row left, so a rerun recreates it:
 * delete its file as well.
 *
 * Within a run, sets are timestamped a minute apart in slug order (first slug
 * newest), so the Community feed shows them in a stable order. Slugs listed in
 * FEATURE are then featured, the first one newest. All of them are checked
 * first, so a typo or an unlisted set fails before any featuredAt is written.
 *
 * The public author name is the account's Logto username. The users table
 * keeps it as of sign-up only, so pass USERNAME if it has changed since; it
 * applies only to sets this run creates.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   MAIN_TABLE=quizaroni-<deploymentType>-main AWS_REGION=us-west-2 \
 *     USER_UUID=<owner> [USERNAME=<name>] [FEATURE=slug-a,slug-b] \
 *     [USERS_TABLE=<defaults to MAIN_TABLE with -users for -main>] \
 *     pnpm --filter @quizaroni/api seed:studysets
 *   # add DRY_RUN=1 to only report what would change.
 */
import { createHash, randomUUID } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { SubjectId } from '@quizaroni/shared-types';
import type { Card } from 'models/studysets';
import { defaultStudysetMetadata } from '../utilities/defaultMetadata';
import { buildPublishUpdate, isFilled, validatePublishRequest } from '../utilities/publishStudyset';
import { isDryRun } from './dryRun';
import { featureStudyset, isListedForFeature } from './featureStudyset';

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
    usersTable: string;
    userUUID: string;
    username?: string;
    feature: string[];
    dryRun: boolean;
};

export const readSeedConfig = (env: NodeJS.ProcessEnv): SeedConfig => {
    const tableName = env.MAIN_TABLE ?? '';
    if (!tableName) {
        throw new Error('Set MAIN_TABLE to the target table name, e.g. quizaroni-production-main');
    }
    const usersTable = env.USERS_TABLE || (tableName.endsWith('-main') ? tableName.replace(/-main$/, '-users') : '');
    if (!usersTable) {
        throw new Error('Set USERS_TABLE; it can only be derived from a MAIN_TABLE ending in -main');
    }
    const userUUID = env.USER_UUID ?? '';
    if (!userUUID) {
        throw new Error('Set USER_UUID to the Logto user id of the account that will own the sets');
    }
    const feature = (env.FEATURE ?? '')
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean);
    return {
        tableName,
        usersTable,
        userUUID,
        username: env.USERNAME?.trim() || undefined,
        feature,
        dryRun: isDryRun(env.DRY_RUN),
    };
};

/** Checks one parsed file; returns its problems, or none if it can be seeded. */
export const validateSeedSet = (raw: unknown, fileSlug: string): string[] => {
    const set = (raw ?? {}) as Partial<Record<keyof SeedSet, unknown>>;
    const problems: string[] = [];
    if (set.slug !== fileSlug) problems.push(`slug must match the file name ("${fileSlug}")`);
    if (!isFilled(set.title)) problems.push('title is missing');
    if (!isFilled(set.description)) problems.push('description is missing');
    if (!Array.isArray(set.cards)) {
        problems.push('cards must be an array');
    } else if (set.cards.some((card) => !isFilled(card?.term) || !isFilled(card?.definition))) {
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

const seedKey = (userUUID: string, slug: string) => ({
    PK: `userUUID#${userUUID}`,
    SK: `studyset#${seedStudysetUUID(userUUID, slug)}`,
});

const toCard = ({ term, definition }: SeedSet['cards'][number]): Card => ({
    cardUUID: randomUUID(),
    term: term.trim(),
    definition: definition.trim(),
    categories: [],
    files: [],
    important: false,
    notes: [],
});

/**
 * Checks the owner exists in the users table (written by the Logto sign-up
 * webhook) and returns the name to publish under: USERNAME if given, else the
 * username stored at sign-up.
 */
export const resolveOwnerUsername = async (
    docClient: DynamoDBDocumentClient,
    usersTable: string,
    userUUID: string,
    override?: string,
    log: (message: string) => void = console.log
): Promise<string> => {
    const { Item } = await docClient.send(
        new GetCommand({ TableName: usersTable, Key: { PK: `user#${userUUID}`, SK: 'userData' } })
    );
    if (!Item) {
        throw new Error(`No user ${userUUID} in ${usersTable}; sign the account up on this environment first`);
    }
    const stored = isFilled(Item.username) ? Item.username : undefined;
    if (override && stored && override !== stored) {
        log(`USERNAME "${override}" differs from the username at sign-up, "${stored}"; using "${override}"`);
    }
    const username = override ?? stored;
    if (!username) {
        throw new Error(
            `User ${userUUID} had no username at sign-up; set USERNAME to the account's Logto username`
        );
    }
    return username;
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
}): Promise<{ created: string[]; incomplete: string[]; skipped: string[] }> => {
    const slugs = new Set(sets.map((set) => set.slug));
    const unknown = feature.filter((slug) => !slugs.has(slug));
    if (unknown.length > 0) {
        throw new Error(`FEATURE names slugs with no seed file: ${unknown.join(', ')}`);
    }

    const created: string[] = [];
    const incomplete: string[] = [];
    const skipped: string[] = [];

    for (const [index, set] of sets.entries()) {
        const studysetUUID = seedStudysetUUID(userUUID, set.slug);
        const Key = seedKey(userUUID, set.slug);
        const timestamp = new Date(now.getTime() - index * 60_000).toISOString();

        const { Item } = await docClient.send(
            new GetCommand({ TableName: tableName, Key, ProjectionExpression: 'PK, publishedAt' })
        );
        if (Item?.publishedAt) {
            log(`skip ${set.slug} (${studysetUUID}): already published`);
            skipped.push(set.slug);
            continue;
        }
        if (Item) {
            log(`INCOMPLETE ${set.slug} (${studysetUUID}): created but never published; publish or delete it in the app`);
            incomplete.push(set.slug);
            continue;
        }

        log(
            `${dryRun ? '[dry-run] would ' : ''}create and publish ${set.slug} (${studysetUUID}): ${set.cards.length} cards, ${set.subject}`
        );
        if (dryRun) {
            created.push(set.slug);
            continue;
        }

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
                log(`skip ${set.slug} (${studysetUUID}): created by another run just now`);
                skipped.push(set.slug);
                continue;
            }
            throw error;
        }

        try {
            await docClient.send(
                new UpdateCommand({
                    TableName: tableName,
                    Key,
                    ...buildPublishUpdate({
                        studysetUUID,
                        subject: set.subject,
                        publishedAt: timestamp,
                        username,
                        now: timestamp,
                    }),
                })
            );
        } catch (error) {
            // Undo the create so a rerun starts this set afresh instead of reporting it incomplete.
            await docClient
                .send(
                    new DeleteCommand({
                        TableName: tableName,
                        Key,
                        ConditionExpression: 'attribute_not_exists(publishedAt)',
                    })
                )
                .catch((deleteError) =>
                    log(`could not undo the create of ${set.slug}: ${(deleteError as Error).message}`)
                );
            throw error;
        }
        created.push(set.slug);
    }

    // Check every slug before writing any featuredAt, so a typo or an unlisted
    // set doesn't leave the row half reordered.
    const pendingInDryRun = new Set(dryRun ? created : []);
    const notListed: string[] = [];
    for (const slug of feature) {
        if (pendingInDryRun.has(slug)) continue;
        if (!(await isListedForFeature(docClient, tableName, seedKey(userUUID, slug)))) {
            notListed.push(slug);
        }
    }
    if (notListed.length > 0) {
        const named = notListed.map((slug) => (incomplete.includes(slug) ? `${slug} (incomplete)` : slug));
        throw new Error(`FEATURE names sets that aren't listed on Explore: ${named.join(', ')}`);
    }

    // Featured is ordered by featuredAt, newest first, so the first slug gets the latest time.
    for (const [index, slug] of feature.entries()) {
        const key = seedKey(userUUID, slug);
        if (pendingInDryRun.has(slug)) {
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

    return { created, incomplete, skipped };
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

    resolveOwnerUsername(docClient, config.usersTable, config.userUUID, config.username)
        .then((username) => {
            console.log(`Seeding ${sets.length} sets into ${config.tableName} as "${username}"\n`);
            return seedStudysets({ docClient, ...config, username, sets, now: new Date() });
        })
        .then(({ created, incomplete, skipped }) => {
            console.log(
                `\nDone. created=${created.length} skipped=${skipped.length} incomplete=${incomplete.length}${
                    config.dryRun ? ' (dry run — no writes performed)' : ''
                }`
            );
            if (incomplete.length > 0 && !config.dryRun) process.exitCode = 1;
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
