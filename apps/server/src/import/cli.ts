import {
    accessSync,
    constants,
    existsSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { type ConfigDefaults, ConfigError, resolveDataDir } from '../config';
import { acquireDataDirLock, DataDirLockedError } from '../data-dir-lock';
import {
    closeDatabase,
    type Migration,
    openDatabase,
    openMemoryDatabase,
} from '../db';
import { describeDbError } from '../db/errors';
import { user } from '../db/schema';
import { FileStore } from '../files/store';
import type { Output } from '../moderation/cli';
import { applyImport } from './apply';
import { readDynamoExports } from './dynamodb';
import { ImportInputError } from './errors';
import { readLogtoUsers } from './logto';
import { type ImportPlan, planImport } from './plan';
import { formatReport } from './report';
import { listSyncKeys, makeProbe } from './s3';

const LOGTO_EXPORT = `psql "$LOGTO_DB" -At -c "select (to_jsonb(u) - 'custom_data' - 'logto_config' - 'profile' - 'avatar')::text from users u where tenant_id = 'default'" > logto-users.jsonl`;

export const IMPORT_USAGE = `Usage:
  quizaroni import --logto-users <file> --dynamodb <dir> --s3 <dir> [--admin <email>]
                   [--dry-run] [--report <file>] [--data-dir <path>]

Moves the hosted Quizaroni into an empty self-host data directory. Stop the
server first: the import refuses while it runs (the lock works on local disks
and Docker volumes, not network shares).

  --logto-users <file>  Logto's users table as JSON lines, from:
                        ${LOGTO_EXPORT}
  --dynamodb <dir>      A folder holding one full DynamoDB export (DYNAMODB_JSON)
                        of the *-main table and one of the *-users table
  --s3 <dir>            An "aws s3 sync" of the main bucket
  --admin <email>       Make this imported user the instance admin
  --dry-run             Check everything and print the report; write nothing
  --report <file>       Also write the full report as JSON
  --data-dir <path>     The data directory (QZ_DATA_DIR, same default as the server)

Accounts without a usable password get a reset link from: quizaroni claim-links --csv`;

const CONSOLE: Output = {
    log: (line) => console.log(line),
    error: (line) => console.error(line),
};

// Why the report can't be written there, checked without creating or touching it.
function unwritable(file: string): string | undefined {
    try {
        if (!statSync(dirname(file)).isDirectory()) {
            return `${dirname(file)} is not a folder`;
        }
        accessSync(dirname(file), constants.W_OK);
        if (existsSync(file)) {
            if (statSync(file).isDirectory()) return 'it is a folder';
            accessSync(file, constants.W_OK);
        }
        return undefined;
    } catch (err) {
        return (err as Error).message;
    }
}

function filesDirEmpty(dir: string): boolean {
    return !existsSync(dir) || readdirSync(dir).length === 0;
}

/** Runs `quizaroni import`. Returns the exit code. */
export async function runImport(
    argv: string[],
    env: Record<string, string | undefined>,
    cwd: string,
    o: {
        defaults?: ConfigDefaults;
        migrations?: readonly Migration[];
        out?: Output;
        now?: Date;
    } = {}
): Promise<number> {
    const out = o.out ?? CONSOLE;
    const usageError = (message: string) => {
        out.error(message);
        out.error(IMPORT_USAGE);
        return 1;
    };

    let values: Record<string, string | boolean | undefined>;
    try {
        ({ values } = parseArgs({
            args: argv,
            strict: true,
            allowPositionals: false,
            options: {
                'logto-users': { type: 'string' },
                dynamodb: { type: 'string' },
                s3: { type: 'string' },
                admin: { type: 'string' },
                'dry-run': { type: 'boolean' },
                report: { type: 'string' },
                'data-dir': { type: 'string' },
                help: { type: 'boolean' },
            },
        }));
    } catch (err) {
        return usageError((err as Error).message);
    }
    if (values.help) {
        out.log(IMPORT_USAGE);
        return 0;
    }
    const path = (name: string) => {
        const v = values[name];
        return typeof v === 'string' && v !== '' ? resolve(cwd, v) : undefined;
    };
    const logtoFile = path('logto-users');
    const dynamoDir = path('dynamodb');
    const s3Dir = path('s3');
    if (!logtoFile || !dynamoDir || !s3Dir) {
        return usageError(
            '--logto-users, --dynamodb and --s3 are all required'
        );
    }
    const dryRun = values['dry-run'] === true;
    const admin = typeof values.admin === 'string' ? values.admin : undefined;

    // Inputs are read and planned before the data dir is touched, so bad input
    // never leaves a half-made data dir behind.
    let plan: ImportPlan;
    try {
        const { users: logto, otherTenants } = readLogtoUsers(logtoFile);
        const dynamo = readDynamoExports(dynamoDir);
        if (!existsSync(s3Dir)) {
            throw new ImportInputError(`${s3Dir} does not exist`);
        }
        plan = planImport(
            { logto, dynamo },
            { admin, probe: makeProbe(s3Dir), now: o.now }
        );
        const c = plan.report.counts;
        c.logto_other_tenant_users = otherTenants;
        for (const e of dynamo.exports) c[`export.${e.tableName}`] = e.read;
        c.unsafe_keys_dropped = dynamo.unsafeKeysDropped;
        const syncKeys = listSyncKeys(s3Dir);
        c.s3_files = syncKeys.length;
        c.unreferenced_s3_files =
            syncKeys.length -
            new Set(plan.copies.map((copy) => copy.from)).size;
    } catch (err) {
        if (!(err instanceof ImportInputError)) throw err;
        out.error(err.message);
        return 1;
    }

    // Checked now so a bad path fails before anything is imported, but written
    // only once the run succeeds, so a report never describes a refused or
    // undone import (or overwrites the report of an earlier one).
    const reportFile = path('report');
    const reportProblem = reportFile ? unwritable(reportFile) : undefined;
    if (reportFile && reportProblem) {
        out.error(
            `Could not write the report to ${reportFile}: ${reportProblem}`
        );
        return 1;
    }
    const printReport = () => {
        for (const line of formatReport(plan.report)) out.log(line);
        if (!reportFile) return;
        try {
            writeFileSync(reportFile, JSON.stringify(plan.report, null, 2));
            out.log(`Full report written to ${reportFile}`);
        } catch (err) {
            out.error(
                `Could not write the report to ${reportFile}: ${(err as Error).message}. Rerun with --dry-run --report <file> and the same inputs to get it.`
            );
        }
    };

    if (dryRun) {
        const { sqlite, db } = openMemoryDatabase(o.migrations);
        try {
            applyImport(db, undefined, plan);
        } catch (err) {
            out.error(`The import would fail: ${describeDbError(err)}`);
            return 1;
        } finally {
            closeDatabase(sqlite);
        }
        printReport();
        out.log(
            `Dry run: nothing was imported. ${plan.users.length} users and ${plan.studysets.length} sets would be imported.`
        );
        return 0;
    }

    let dataDir: string;
    try {
        const flag = values['data-dir'];
        dataDir = resolveDataDir(
            typeof flag === 'string' ? flag : undefined,
            env,
            cwd,
            o.defaults
        );
    } catch (err) {
        if (!(err instanceof ConfigError)) throw err;
        return usageError(err.message);
    }

    let lock: ReturnType<typeof acquireDataDirLock>;
    try {
        lock = acquireDataDirLock(dataDir);
    } catch (err) {
        out.error(
            err instanceof DataDirLockedError
                ? `Quizaroni is running on ${dataDir} (or another import is); stop it first.`
                : `Could not lock ${dataDir}: ${(err as Error).message}`
        );
        return 1;
    }
    try {
        const { sqlite, db } = openDatabase(dataDir, o.migrations);
        try {
            const files = new FileStore(dataDir);
            if (db.select({ id: user.id }).from(user).limit(1).get()) {
                out.error(
                    `${dataDir} already has users; the import only writes into an empty instance.`
                );
                return 1;
            }
            if (!filesDirEmpty(files.filesDir)) {
                out.error(
                    `${files.filesDir} is not empty; the import only writes into an empty instance. If an earlier import was interrupted, delete ${files.filesDir} and run it again.`
                );
                return 1;
            }
            try {
                applyImport(db, files, plan);
            } catch (err) {
                // Verified absent or empty above, so this removes only what the
                // import made, directories included, and a rerun starts clean.
                rmSync(files.filesDir, { recursive: true, force: true });
                out.error(
                    `The import failed and was undone: ${describeDbError(err)}`
                );
                return 1;
            }
        } finally {
            closeDatabase(sqlite);
        }
    } finally {
        lock.release();
    }

    printReport();
    out.log(
        `Imported ${plan.users.length} users and ${plan.studysets.length} sets into ${dataDir}. Start the server.`
    );
    const noPassword = plan.users.filter(
        (u) => !u.accounts.some((a) => a.providerId === 'credential')
    ).length;
    if (noPassword > 0) {
        out.log(
            `${noPassword} accounts have no password: run quizaroni claim-links --csv to make reset links for them.`
        );
    }
    if (!admin) {
        out.log(
            'No admin was imported. Finish setup with an email that is not an imported account, or rerun into an empty data dir with --admin <email>.'
        );
    }
    return 0;
}
