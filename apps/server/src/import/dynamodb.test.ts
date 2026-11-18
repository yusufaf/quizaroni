import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fromDynamoJson, readDynamoExports } from './dynamodb';
import { ImportInputError } from './errors';
import { writeDynamoExport } from './testing';

let root: string | undefined;
afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

function tempRoot(): string {
    root = mkdtempSync(join(tmpdir(), 'qz-dynamo-'));
    return root;
}

const ctx = () => ({ unsafeKeys: 0 });

describe('fromDynamoJson', () => {
    test.each([
        [{ S: 'x' }, 'x'],
        [{ N: '1.5' }, 1.5],
        [{ BOOL: true }, true],
        [{ NULL: true }, null],
        [{ L: [{ S: 'a' }, { N: '2' }] }, ['a', 2]],
        [{ M: { a: { S: 'b' } } }, { a: 'b' }],
        [{ SS: ['a', 'b'] }, ['a', 'b']],
        [{ NS: ['1', '2'] }, [1, 2]],
        [{ B: 'AAE=' }, 'AAE='],
        [{ BS: ['AAE='] }, ['AAE=']],
    ])('%j', (attr, expected) => {
        expect(fromDynamoJson(attr, ctx())).toEqual(expected);
    });

    test('an unknown type is an input error', () => {
        expect(() => fromDynamoJson({ X: 1 }, ctx())).toThrow(ImportInputError);
    });

    test('a __proto__ key is dropped, not used as the prototype', () => {
        const c = ctx();
        const attr = JSON.parse(
            '{"M":{"__proto__":{"M":{"polluted":{"BOOL":true}}},"ok":{"S":"y"}}}'
        );
        const result = fromDynamoJson(attr, c) as Record<string, unknown>;
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(Object.hasOwn(result, '__proto__')).toBe(false);
        expect((result as { polluted?: unknown }).polluted).toBeUndefined();
        expect(result.ok).toBe('y');
        expect(c.unsafeKeys).toBe(1);
    });
});

describe('readDynamoExports', () => {
    const MAIN = 'quizaroni-prod-main';
    const USERS = 'quizaroni-prod-users';

    test('reads both tables back', () => {
        const r = tempRoot();
        writeDynamoExport(r, MAIN, [{ PK: 'userUUID#a', SK: 'studyset#1' }]);
        writeDynamoExport(r, USERS, [
            { PK: 'user#a', SK: 'userData', labels: ['x'] },
        ]);
        const out = readDynamoExports(r);
        expect(out.main).toEqual([{ PK: 'userUUID#a', SK: 'studyset#1' }]);
        expect(out.users).toEqual([
            { PK: 'user#a', SK: 'userData', labels: ['x'] },
        ]);
        expect(out.exports.map((e) => [e.tableName, e.itemCount])).toEqual(
            expect.arrayContaining([
                [MAIN, 1],
                [USERS, 1],
            ])
        );
    });

    function emptyPartition(r: string, bytes: Uint8Array, itemCount: number) {
        const dir = writeDynamoExport(r, MAIN, [{ PK: 'p', SK: 's' }]);
        writeFileSync(join(dir, 'data', 'empty.json.gz'), bytes);
        writeFileSync(
            join(dir, 'manifest-files.json'),
            [
                JSON.stringify({
                    itemCount: 1,
                    dataFileS3Key: 'x/data/part-0.json.gz',
                }),
                JSON.stringify({
                    itemCount,
                    dataFileS3Key: 'x/data/empty.json.gz',
                }),
            ].join('\n') + '\n'
        );
        writeFileSync(
            join(dir, 'manifest-summary.json'),
            JSON.stringify({
                tableArn: `arn:aws:dynamodb:us-west-2:0:table/${MAIN}`,
                itemCount: 1 + itemCount,
                outputFormat: 'DYNAMODB_JSON',
            })
        );
        writeDynamoExport(r, USERS, []);
    }

    test('a 0-byte partition file reads as zero items', () => {
        const r = tempRoot();
        emptyPartition(r, new Uint8Array(0), 0);
        expect(readDynamoExports(r).main).toHaveLength(1);
    });

    test('a gzip of nothing reads as zero items', () => {
        const r = tempRoot();
        emptyPartition(r, gzipSync(''), 0);
        expect(readDynamoExports(r).main).toHaveLength(1);
    });

    test('a 0-byte file the manifest counts as one item is a mismatch', () => {
        const r = tempRoot();
        emptyPartition(r, new Uint8Array(0), 1);
        expect(() => readDynamoExports(r)).toThrow(/count/);
    });

    test('a summary count mismatch is an input error', () => {
        const r = tempRoot();
        writeDynamoExport(r, MAIN, [{ PK: 'p', SK: 's' }], { summaryCount: 2 });
        writeDynamoExport(r, USERS, []);
        expect(() => readDynamoExports(r)).toThrow(ImportInputError);
    });

    test('a missing data file is an input error', () => {
        const r = tempRoot();
        const dir = writeDynamoExport(r, MAIN, [{ PK: 'p', SK: 's' }]);
        rmSync(join(dir, 'data', 'part-0.json.gz'));
        writeDynamoExport(r, USERS, []);
        expect(() => readDynamoExports(r)).toThrow(/missing/i);
    });

    test('an incremental export is refused', () => {
        const r = tempRoot();
        const dir = writeDynamoExport(r, MAIN, []);
        writeFileSync(
            join(dir, 'manifest-summary.json'),
            JSON.stringify({
                tableArn: `arn:aws:dynamodb:us-west-2:0:table/${MAIN}`,
                itemCount: 0,
                outputFormat: 'DYNAMODB_JSON',
                exportType: 'INCREMENTAL_EXPORT',
            })
        );
        writeDynamoExport(r, USERS, []);
        expect(() => readDynamoExports(r)).toThrow(/full export/);
    });

    test('a summary that names FULL_EXPORT is accepted', () => {
        const r = tempRoot();
        const dir = writeDynamoExport(r, MAIN, []);
        writeFileSync(
            join(dir, 'manifest-summary.json'),
            JSON.stringify({
                tableArn: `arn:aws:dynamodb:us-west-2:0:table/${MAIN}`,
                itemCount: 0,
                outputFormat: 'DYNAMODB_JSON',
                exportType: 'FULL_EXPORT',
            })
        );
        writeDynamoExport(r, USERS, []);
        expect(readDynamoExports(r).main).toEqual([]);
    });

    test.each([
        [
            'a corrupt gzip',
            (dir: string) =>
                writeFileSync(join(dir, 'data', 'part-0.json.gz'), 'not gzip'),
        ],
        [
            'a bad manifest line',
            (dir: string) =>
                writeFileSync(join(dir, 'manifest-files.json'), '{oops\n'),
        ],
        [
            'a bad data line',
            (dir: string) =>
                writeFileSync(
                    join(dir, 'data', 'part-0.json.gz'),
                    gzipSync('{oops\n')
                ),
        ],
        [
            'a line with no Item',
            (dir: string) =>
                writeFileSync(
                    join(dir, 'data', 'part-0.json.gz'),
                    gzipSync('{}\n')
                ),
        ],
    ])('%s is an input error', (_name, corrupt) => {
        const r = tempRoot();
        corrupt(writeDynamoExport(r, MAIN, [{ PK: 'p', SK: 's' }]));
        writeDynamoExport(r, USERS, []);
        expect(() => readDynamoExports(r)).toThrow(ImportInputError);
    });

    test('a bad data line is reported with its line number', () => {
        const r = tempRoot();
        const dir = writeDynamoExport(r, MAIN, [], {
            lines: ['{"Item":{"PK":{"S":"a"}}}', '{oops'],
        });
        writeDynamoExport(r, USERS, []);
        expect(() => readDynamoExports(r)).toThrow(/line 2/);
        expect(dir).toBeDefined();
    });

    test('two main exports are refused', () => {
        const r = tempRoot();
        writeDynamoExport(r, MAIN, [], { exportId: 'one' });
        writeDynamoExport(r, MAIN, [], { exportId: 'two' });
        writeDynamoExport(r, USERS, []);
        expect(() => readDynamoExports(r)).toThrow(/exactly one/);
    });
});
