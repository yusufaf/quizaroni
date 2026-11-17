import { parseArgs } from 'node:util';
import { normalizeText, truncateText } from '@quizaroni/shared-types';
import { type ConfigDefaults, ConfigError, loadConfig } from '../config';
import {
    closeDatabase,
    DatabaseStateError,
    type Db,
    type Migration,
    openExistingDatabase,
} from '../db';
import { describeDbError } from '../db/errors';
import { FEATURED_LIMIT } from '../public/explore';
import { isStudysetUUID } from '../studysets/updates';
import {
    featureSet,
    featuredCount,
    hideSet,
    type ModerationResult,
    unfeatureSet,
    unhideSet,
    unpublishSet,
} from './moderation';

export const MODERATION_COMMANDS = ['feature', 'hide', 'unpublish'] as const;
export type ModerationCommand = (typeof MODERATION_COMMANDS)[number];

export function isModerationCommand(
    value: string | undefined
): value is ModerationCommand {
    return (MODERATION_COMMANDS as readonly (string | undefined)[]).includes(
        value
    );
}

export const MODERATION_USAGE = `Usage:
  quizaroni feature <set> [--clear] [--data-dir <path>]   Feature a listed set at the front of Explore's Featured row; --clear unfeatures it
  quizaroni hide <set> [--clear] [--data-dir <path>]      Take a set down: off Explore and its public link, and its owner can't publish it again; --clear lifts that
  quizaroni unpublish <set> [--data-dir <path>]           Take a set off Explore; its owner can publish it again

  <set>                 A study set id, or its public link (https://<host>/view/<id>)
  --data-dir <path>     The server's data directory (QZ_DATA_DIR, same default as the server)

Runs safely while the server is running.`;

export type Output = { log(line: string): void; error(line: string): void };

const CONSOLE: Output = {
    log: (line) => console.log(line),
    error: (line) => console.error(line),
};

export function parseSetRef(value: string): string | undefined {
    const v = value.trim();
    if (isStudysetUUID(v)) return v;
    try {
        const m = new URL(v).pathname.match(/^\/view\/([^/]+)\/?$/);
        if (!m?.[1]) return undefined;
        const id = decodeURIComponent(m[1]);
        return isStudysetUUID(id) ? id : undefined;
    } catch {
        return undefined;
    }
}

// Set titles are user content; escape sequences in them must not reach the
// admin's terminal.
export function printable(text: string, maxChars = 60): string {
    const stripped = text
        .replace(/(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g, '')
        .replace(/[\p{Cc}\p{Cf}]/gu, ' ');
    return truncateText(normalizeText(stripped), maxChars);
}

type Operation = (db: Db, id: string, now: Date) => ModerationResult;

const OPERATIONS: Record<ModerationCommand, [Operation, Operation | undefined]> = {
    feature: [featureSet, (db, id) => unfeatureSet(db, id)],
    hide: [hideSet, unhideSet],
    unpublish: [unpublishSet, undefined],
};

function messages(
    command: ModerationCommand,
    clear: boolean,
    id: string,
    t: string
): { changed: string; unchanged: string } {
    const set = `${id} "${t}"`;
    if (command === 'feature') {
        return clear
            ? { changed: `Unfeatured ${set}.`, unchanged: `${set} was not featured; nothing changed.` }
            : { changed: `Featured ${set} at the front of Explore's Featured row.`, unchanged: '' };
    }
    if (command === 'hide') {
        return clear
            ? {
                  changed: `Unhid ${set}; its owner can publish it again. Copies made while it was hidden stay hidden.`,
                  unchanged: `${set} is not hidden; nothing changed.`,
              }
            : {
                  changed: `Hid ${set}: it is off Explore and its public link, and its owner can't publish it again. Undo with: quizaroni hide --clear ${id}`,
                  unchanged: `${set} is already hidden; nothing changed.`,
              };
    }
    return {
        changed: `Unpublished ${set}; its owner can publish it again (use hide to stop that).`,
        unchanged: `${set} is not published; nothing changed.`,
    };
}

/** Runs one moderation command against the server's DB. Returns the exit code. */
export function runModeration(
    command: ModerationCommand,
    argv: string[],
    env: Record<string, string | undefined>,
    cwd: string,
    o: {
        defaults?: ConfigDefaults;
        migrations?: readonly Migration[];
        out?: Output;
        now?: Date;
    } = {}
): number {
    const out = o.out ?? CONSOLE;
    const usageError = (message: string) => {
        out.error(message);
        out.error(MODERATION_USAGE);
        return 1;
    };

    let values: { 'data-dir'?: string; clear?: boolean; help?: boolean };
    let positionals: string[];
    try {
        ({ values, positionals } = parseArgs({
            args: argv,
            strict: true,
            allowPositionals: true,
            options: {
                'data-dir': { type: 'string' },
                clear: { type: 'boolean' },
                help: { type: 'boolean' },
            },
        }));
    } catch (err) {
        return usageError((err as Error).message);
    }
    if (values.help) {
        out.log(MODERATION_USAGE);
        return 0;
    }
    const clear = values.clear === true;
    if (command === 'unpublish' && clear) {
        return usageError(
            'unpublish has no --clear; the owner can publish the set again'
        );
    }
    if (positionals.length !== 1) {
        return usageError(`${command} takes exactly one study set id or link`);
    }
    const ref = positionals[0] ?? '';
    const id = parseSetRef(ref);
    if (id === undefined) {
        return usageError(`Not a study set id or /view/ link: "${printable(ref)}"`);
    }

    const flag = values['data-dir'];
    let dataDir: string;
    try {
        dataDir = loadConfig(
            flag === undefined ? [] : ['--data-dir', flag],
            env,
            cwd,
            o.defaults
        ).dataDir;
    } catch (err) {
        if (!(err instanceof ConfigError)) throw err;
        return usageError(err.message);
    }

    let opened: ReturnType<typeof openExistingDatabase>;
    try {
        opened = openExistingDatabase(dataDir, o.migrations);
    } catch (err) {
        out.error(
            err instanceof DatabaseStateError
                ? err.message
                : `Could not open the database in ${dataDir}: ${describeDbError(err)}`
        );
        return 1;
    }

    try {
        const [apply, undo] = OPERATIONS[command];
        const operation = clear ? undo : apply;
        if (!operation) return 1;
        const result = operation(opened.db, id, o.now ?? new Date());
        if (result.status === 'not_found') {
            out.error(`No study set ${id} in ${dataDir}.`);
            return 1;
        }
        const t = printable(result.row.title);
        if (result.status === 'not_listed') {
            out.error(
                `Study set ${id} "${t}" is not on Explore (private, unpublished or hidden); only a listed set can be featured.`
            );
            return 1;
        }
        const text = messages(command, clear, id, t);
        out.log(result.status === 'changed' ? text.changed : text.unchanged);
        if (command === 'feature' && !clear) {
            const n = featuredCount(opened.db);
            if (n > FEATURED_LIMIT) {
                out.log(
                    `${n} sets are featured; Explore shows the newest ${FEATURED_LIMIT}.`
                );
            }
        }
        return 0;
    } catch (err) {
        out.error(`Could not ${command} ${id}: ${describeDbError(err)}`);
        return 1;
    } finally {
        closeDatabase(opened.sqlite);
    }
}
