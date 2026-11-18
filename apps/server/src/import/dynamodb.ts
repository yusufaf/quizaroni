import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { UNSAFE_KEYS } from '../users/metadata';
import { ImportInputError } from './errors';

export type DynamoItem = Record<string, unknown>;

/** Converts one DynamoDB-JSON attribute value to plain JSON. */
export function fromDynamoJson(
    attr: unknown,
    ctx: { unsafeKeys: number }
): unknown {
    if (attr === null || typeof attr !== 'object' || Array.isArray(attr)) {
        throw new ImportInputError(`Not a DynamoDB attribute: ${JSON.stringify(attr)}`);
    }
    const [type, value] = Object.entries(attr)[0] ?? [];
    switch (type) {
        case 'S':
        case 'B':
            return value;
        case 'N':
            return Number(value);
        case 'BOOL':
            return value === true;
        case 'NULL':
            return null;
        case 'SS':
        case 'BS':
            return Array.isArray(value) ? [...value] : [];
        case 'NS':
            return Array.isArray(value) ? value.map(Number) : [];
        case 'L':
            return Array.isArray(value)
                ? value.map((v) => fromDynamoJson(v, ctx))
                : [];
        case 'M':
            return fromDynamoMap(value, ctx);
        default:
            throw new ImportInputError(`Unknown DynamoDB type: ${type}`);
    }
}

// defineProperty, never assignment: assigning a "__proto__" key would set the
// object's prototype instead of a property.
function fromDynamoMap(value: unknown, ctx: { unsafeKeys: number }): DynamoItem {
    const out: DynamoItem = {};
    if (value === null || typeof value !== 'object') return out;
    for (const [key, attr] of Object.entries(value)) {
        if (UNSAFE_KEYS.has(key)) {
            ctx.unsafeKeys++;
            continue;
        }
        Object.defineProperty(out, key, {
            value: fromDynamoJson(attr, ctx),
            enumerable: true,
            writable: true,
            configurable: true,
        });
    }
    return out;
}

export type DynamoExports = {
    main: DynamoItem[];
    users: DynamoItem[];
    exports: { tableName: string; itemCount: number; read: number }[];
    unsafeKeysDropped: number;
};

function findSummaries(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) findSummaries(path, out);
        else if (entry.name === 'manifest-summary.json') out.push(path);
    }
    return out;
}

function readJson(file: string): Record<string, unknown> {
    try {
        return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    } catch (err) {
        throw new ImportInputError(`${file}: ${(err as Error).message}`);
    }
}

function parseLine(file: string, line: string): Record<string, unknown> {
    try {
        const value: unknown = JSON.parse(line);
        if (value !== null && typeof value === 'object') {
            return value as Record<string, unknown>;
        }
    } catch {
        // reported below
    }
    throw new ImportInputError(`${file}: not a JSON object line`);
}

function jsonLines(text: string): string[] {
    return text.split('\n').filter((line) => line.trim() !== '');
}

/** Reads the full exports of the main and users tables found under root. */
export function readDynamoExports(root: string): DynamoExports {
    const ctx = { unsafeKeys: 0 };
    const tables: { main: DynamoItem[][]; users: DynamoItem[][] } = {
        main: [],
        users: [],
    };
    const exports: DynamoExports['exports'] = [];
    for (const summaryFile of findSummaries(root)) {
        const dir = join(summaryFile, '..');
        const summary = readJson(summaryFile);
        if (
            summary.exportType !== undefined &&
            summary.exportType !== 'FULL_EXPORT'
        ) {
            throw new ImportInputError(
                `${summaryFile}: only a full export can be imported (got ${String(summary.exportType)})`
            );
        }
        if (summary.outputFormat !== 'DYNAMODB_JSON') {
            throw new ImportInputError(
                `${summaryFile}: outputFormat must be DYNAMODB_JSON`
            );
        }
        const tableName = String(summary.tableArn ?? '').split('/').pop() ?? '';
        const kind = tableName.endsWith('-main')
            ? 'main'
            : tableName.endsWith('-users')
              ? 'users'
              : undefined;
        if (!kind) continue;

        const items: DynamoItem[] = [];
        const manifestFile = join(dir, 'manifest-files.json');
        if (!existsSync(manifestFile)) {
            throw new ImportInputError(`${manifestFile} is missing`);
        }
        for (const line of jsonLines(readFileSync(manifestFile, 'utf8'))) {
            const entry = parseLine(manifestFile, line) as {
                itemCount?: unknown;
                dataFileS3Key?: unknown;
            };
            if (
                typeof entry.itemCount !== 'number' ||
                typeof entry.dataFileS3Key !== 'string'
            ) {
                throw new ImportInputError(`${manifestFile}: not a manifest line`);
            }
            const dataFile = join(dir, 'data', basename(entry.dataFileS3Key));
            if (!existsSync(dataFile)) {
                throw new ImportInputError(`Data file ${dataFile} is missing`);
            }
            // AWS writes an empty file for an empty partition, which gunzip rejects.
            let lines: string[] = [];
            if (statSync(dataFile).size > 0) {
                try {
                    lines = jsonLines(
                        gunzipSync(readFileSync(dataFile)).toString('utf8')
                    );
                } catch (err) {
                    throw new ImportInputError(
                        `${dataFile}: ${(err as Error).message}`
                    );
                }
            }
            if (lines.length !== entry.itemCount) {
                throw new ImportInputError(
                    `${dataFile}: item count ${lines.length} does not match the manifest's ${entry.itemCount}`
                );
            }
            for (const l of lines) {
                const parsed = parseLine(dataFile, l) as { Item?: unknown };
                if (
                    parsed.Item === null ||
                    typeof parsed.Item !== 'object' ||
                    Array.isArray(parsed.Item)
                ) {
                    throw new ImportInputError(`${dataFile}: a line has no Item`);
                }
                items.push(fromDynamoMap(parsed.Item, ctx));
            }
        }
        if (items.length !== summary.itemCount) {
            throw new ImportInputError(
                `${summaryFile}: item count ${items.length} does not match the summary's ${String(summary.itemCount)}`
            );
        }
        tables[kind].push(items);
        exports.push({
            tableName,
            itemCount: Number(summary.itemCount),
            read: items.length,
        });
    }
    if (tables.main.length !== 1 || tables.users.length !== 1) {
        throw new ImportInputError(
            `Expected exactly one full export of the *-main table and one of the *-users table under ${root}; found ${tables.main.length} and ${tables.users.length}.`
        );
    }
    return {
        main: tables.main[0] ?? [],
        users: tables.users[0] ?? [],
        exports,
        unsafeKeysDropped: ctx.unsafeKeys,
    };
}
