import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Test helpers only: synthetic inputs in the formats the import reads.

export const PNG_BYTES = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48,
    0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89,
]);

export function logtoArgon2i(password: string): Promise<string> {
    return Bun.password.hash(password, {
        algorithm: 'argon2i',
        memoryCost: 8192,
        timeCost: 8,
    });
}

export type LogtoRow = {
    id: string;
    tenant_id?: string;
    username?: string | null;
    primary_email?: string | null;
    password_encrypted?: string | null;
    password_encryption_method?: string | null;
    name?: string | null;
    identities?: Record<string, { userId: string; details?: unknown }>;
    mfa_verifications?: unknown[];
    is_suspended?: boolean;
    is_password_expired?: boolean;
    created_at?: string;
    updated_at?: string;
};

export function logtoRow(row: LogtoRow): Record<string, unknown> {
    return {
        tenant_id: 'default',
        username: null,
        primary_email: null,
        password_encrypted: null,
        password_encryption_method: null,
        name: null,
        identities: {},
        mfa_verifications: [],
        is_suspended: false,
        created_at: '2026-01-02T03:04:05.123456+00:00',
        updated_at: '2026-01-02T03:04:05.123456+00:00',
        ...row,
    };
}

export function writeLogtoUsers(file: string, rows: LogtoRow[]): string {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
        file,
        rows.map((r) => JSON.stringify(logtoRow(r))).join('\n') + '\n'
    );
    return file;
}

export function toDynamoJson(value: unknown): Record<string, unknown> {
    if (value === null || value === undefined) return { NULL: true };
    if (typeof value === 'string') return { S: value };
    if (typeof value === 'number') return { N: String(value) };
    if (typeof value === 'boolean') return { BOOL: value };
    if (Array.isArray(value)) return { L: value.map(toDynamoJson) };
    return {
        M: Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                k,
                toDynamoJson(v),
            ])
        ),
    };
}

export function dynamoItemLine(item: Record<string, unknown>): string {
    return JSON.stringify({
        Item: Object.fromEntries(
            Object.entries(item).map(([k, v]) => [k, toDynamoJson(v)])
        ),
    });
}

/** Writes one full DynamoDB export the way PITR export lays it out. */
export function writeDynamoExport(
    root: string,
    tableName: string,
    items: Record<string, unknown>[],
    o: { exportId?: string; lines?: string[]; summaryCount?: number } = {}
): string {
    const exportId = o.exportId ?? `${tableName}-export`;
    const dir = join(root, 'AWSDynamoDB', exportId);
    mkdirSync(join(dir, 'data'), { recursive: true });
    const lines = o.lines ?? items.map(dynamoItemLine);
    const dataKey = `AWSDynamoDB/${exportId}/data/part-0.json.gz`;
    writeFileSync(
        join(dir, 'data', 'part-0.json.gz'),
        gzipSync(lines.map((l) => l + '\n').join(''))
    );
    writeFileSync(
        join(dir, 'manifest-files.json'),
        JSON.stringify({ itemCount: lines.length, dataFileS3Key: dataKey }) +
            '\n'
    );
    writeFileSync(
        join(dir, 'manifest-summary.json'),
        JSON.stringify({
            tableArn: `arn:aws:dynamodb:us-west-2:000000000000:table/${tableName}`,
            itemCount: o.summaryCount ?? lines.length,
            outputFormat: 'DYNAMODB_JSON',
        })
    );
    return dir;
}

export function writeS3(root: string, key: string, bytes: Uint8Array): void {
    const file = join(root, ...key.split('/'));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
}
