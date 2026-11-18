import { isSubjectId, isValidUsername } from '@quizaroni/shared-types';
import { normalizeEmail } from '../config';
import type { account, studyset, user, userProfile } from '../db/schema';
import { fileURL, isCardFileKey, MAX_AVATAR_BYTES } from '../files/keys';
import { AVATAR_TYPES, sniffContentType } from '../files/sniff';
import {
    collectCardFileKeys,
    DEFAULT_STUDYSET_METADATA,
    isStudysetUUID,
    planCardFileCopies,
    studysetUUIDOfKey,
} from '../studysets/updates';
import {
    DEFAULT_USER_METADATA,
    isPlainObject,
    isStorableValue,
    type JsonObject,
    MAX_METADATA_BYTES,
} from '../users/metadata';
import type { DynamoItem } from './dynamodb';
import { ImportInputError } from './errors';
import { credentialOf, type LogtoUser, socialAccountsOf } from './logto';
import { isUnsafeS3Key } from './s3';

export type Probe = (
    s3Key: string
) => { path: string; size: number; head: Uint8Array } | undefined;

export type Anomaly = { kind: string; id: string; detail?: string };
export type ImportReport = {
    counts: Record<string, number>;
    anomalies: Anomaly[];
};

export type ImportedUser = {
    user: typeof user.$inferInsert;
    profile: typeof userProfile.$inferInsert;
    accounts: (typeof account.$inferInsert)[];
};

export type ImportPlan = {
    users: ImportedUser[];
    studysets: (typeof studyset.$inferInsert)[];
    copies: { from: string; to: string }[];
    report: ImportReport;
};

export const SKIPPED_USER_KINDS = [
    'invalid_user_id',
    'suspended_user',
    'no_email',
    'invalid_email',
    'duplicate_email',
] as const;

const USER_ID = /^[A-Za-z0-9-]{1,64}$/;
const NAME_MAX = 100;

class Collector {
    counts: Record<string, number> = {};
    anomalies: Anomaly[] = [];
    count(key: string, by = 1): void {
        this.counts[key] = (this.counts[key] ?? 0) + by;
    }
    flag(kind: string, id: string, detail?: string): void {
        this.anomalies.push(detail === undefined ? { kind, id } : { kind, id, detail });
        this.count(`anomaly.${kind}`);
    }
}

function parseDate(value: unknown): Date | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

const strings = (value: unknown): string[] =>
    Array.isArray(value)
        ? [...new Set(value.filter((v): v is string => typeof v === 'string'))]
        : [];

export type PublishState = {
    isPublic: boolean;
    publishedAt: Date | null;
    featuredAt: Date | null;
    hiddenAt: Date | null;
    subject: string | null;
    anomalies: string[];
};

// The hosted listed rule (isPubliclyListed) is SK === SK2 && publiclyViewable &&
// not hidden. Self-host keeps the same facts as isPublic/publishedAt/hiddenAt.
export function mapPublishState(item: DynamoItem, updatedAt: Date): PublishState {
    const anomalies: string[] = [];
    const moderation = isPlainObject(item.moderation) ? item.moderation : {};
    const hiddenAt = parseDate(moderation.hiddenAt) ?? null;
    if (moderation.reason !== undefined) anomalies.push('moderation_reason_dropped');
    const metadata = isPlainObject(item.metadata) ? item.metadata : {};
    const viewable = metadata.publiclyViewable === true;
    const indexed = typeof item.SK2 === 'string' && item.SK2 === item.SK;
    if (viewable && !indexed) anomalies.push('publicly_viewable_not_indexed');
    const isPublic = indexed && viewable && hiddenAt === null;
    let publishedAt = parseDate(item.publishedAt) ?? null;
    if (isPublic && publishedAt === null) {
        publishedAt = updatedAt;
        anomalies.push('missing_published_at');
    }
    const listed = isPublic && publishedAt !== null;
    let featuredAt = parseDate(item.featuredAt) ?? null;
    if (featuredAt !== null && !listed) {
        featuredAt = null;
        anomalies.push('featured_not_listed');
    }
    return {
        isPublic,
        publishedAt,
        featuredAt,
        hiddenAt,
        subject: isSubjectId(item.subject) ? item.subject : null,
        anomalies,
    };
}

function avatarS3Key(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    try {
        const path = new URL(value).pathname;
        const at = path.indexOf('/profile-pictures/');
        return at === -1 ? undefined : decodeURIComponent(path.slice(at + 1));
    } catch {
        return undefined;
    }
}

export function planImport(
    src: { logto: LogtoUser[]; dynamo: { main: DynamoItem[]; users: DynamoItem[] } },
    o: { admin?: string; probe: Probe; newId?: () => string; now?: Date }
): ImportPlan {
    const c = new Collector();
    const newId = o.newId ?? (() => crypto.randomUUID());
    const now = o.now ?? new Date();
    const copies = new Map<string, string>();

    // Users-table rows, keyed by Logto id.
    const dynamoUsers = new Map<string, DynamoItem>();
    for (const item of src.dynamo.users) {
        const pk = typeof item.PK === 'string' ? item.PK : '';
        if (pk.startsWith('user#') && item.SK === 'userData') {
            dynamoUsers.set(pk.slice('user#'.length), item);
        } else {
            c.flag('unknown_item', `${pk}|${String(item.SK)}`);
        }
    }

    const setCount = new Map<string, number>();
    for (const item of src.dynamo.main) {
        const pk = typeof item.PK === 'string' ? item.PK : '';
        if (pk.startsWith('userUUID#') && String(item.SK).startsWith('studyset#')) {
            const owner = pk.slice('userUUID#'.length);
            setCount.set(owner, (setCount.get(owner) ?? 0) + 1);
        }
    }
    const sets = (id: string) => `${setCount.get(id) ?? 0} sets`;

    c.count('logto_users', src.logto.length);
    const logtoIds = new Set(src.logto.map((u) => u.id));
    for (const id of dynamoUsers.keys()) {
        if (!logtoIds.has(id)) c.flag('dynamo_user_without_logto', id, sets(id));
    }
    const candidates = src.logto
        .filter((u) => dynamoUsers.has(u.id))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    c.count('quizaroni_users', candidates.length);
    c.count('logto_only_users', src.logto.length - candidates.length);

    const emailOf = new Map<string, string | undefined>();
    const skipOf = new Map<string, string | undefined>();
    const byEmail = new Map<string, string[]>();
    for (const u of candidates) {
        const email = u.primary_email ? normalizeEmail(u.primary_email) : undefined;
        emailOf.set(u.id, email);
        const skip = !USER_ID.test(u.id)
            ? 'invalid_user_id'
            : u.is_suspended
              ? 'suspended_user'
              : !u.primary_email
                ? 'no_email'
                : !email
                  ? 'invalid_email'
                  : undefined;
        skipOf.set(u.id, skip);
        // Only users that would otherwise be imported can collide on an email.
        if (email && !skip) byEmail.set(email, [...(byEmail.get(email) ?? []), u.id]);
    }

    const skipped = new Set<string>();
    const imported = new Map<string, ImportedUser>();
    const usernames = new Set<string>();
    const admin = o.admin ? normalizeEmail(o.admin) : undefined;
    if (o.admin && !admin) throw new ImportInputError(`--admin ${o.admin} is not an email address`);

    for (const u of candidates) {
        const email = emailOf.get(u.id);
        const group = email ? (byEmail.get(email) ?? []) : [];
        const skip =
            skipOf.get(u.id) ?? (group.length > 1 ? 'duplicate_email' : undefined);
        if (skip) {
            skipped.add(u.id);
            c.count(`skipped_users.${skip}`);
            c.flag(
                skip,
                u.id,
                skip === 'duplicate_email'
                    ? `${sets(u.id)}; same email as ${group.filter((g) => g !== u.id).join(', ')}`
                    : sets(u.id)
            );
            continue;
        }
        const row = dynamoUsers.get(u.id) ?? {};
        const created = parseDate(u.created_at) ?? now;
        const updated = parseDate(u.updated_at) ?? created;

        let username: string | null = u.username ?? null;
        if (username !== null) {
            if (!isValidUsername(username)) c.flag('invalid_username', u.id, username);
            if (usernames.has(username.toLowerCase())) {
                c.flag('duplicate_username', u.id, username);
                username = null;
            } else {
                usernames.add(username.toLowerCase());
            }
        }

        let metadata: JsonObject = { ...DEFAULT_USER_METADATA };
        if (row.metadata !== undefined) {
            if (
                isPlainObject(row.metadata) &&
                isStorableValue(row.metadata) &&
                Buffer.byteLength(JSON.stringify(row.metadata)) <= MAX_METADATA_BYTES
            ) {
                metadata = { ...row.metadata };
            } else {
                c.flag('bad_user_metadata', u.id);
            }
        }
        const avatar = isPlainObject(metadata.avatar) ? metadata.avatar : undefined;
        if (avatar?.type === 'upload') {
            const key = avatarS3Key(avatar.value);
            const found =
                key && !isUnsafeS3Key(key) && key.startsWith(`profile-pictures/${u.id}/`)
                    ? o.probe(key)
                    : undefined;
            const type = found ? sniffContentType(found.head) : undefined;
            if (
                found &&
                type &&
                (AVATAR_TYPES as readonly string[]).includes(type) &&
                found.size <= MAX_AVATAR_BYTES
            ) {
                const to = `avatars/${u.id}/${newId()}`;
                copies.set(to, found.path);
                metadata.avatar = { ...avatar, value: fileURL(to) };
                c.count('avatars_copied');
            } else {
                delete metadata.avatar;
                c.flag('avatar_dropped', u.id, key ?? 'unreadable URL');
            }
        }

        const accounts: (typeof account.$inferInsert)[] = [];
        const credential = credentialOf(u);
        if ('hash' in credential) {
            accounts.push({
                id: newId(),
                accountId: u.id,
                providerId: 'credential',
                userId: u.id,
                password: credential.hash,
                createdAt: created,
                updatedAt: updated,
            });
            c.count(`credentials.${credential.hash.split('$')[1] ?? 'argon2'}`);
        } else {
            c.count(`no_credential.${credential.reason}`);
        }
        for (const social of socialAccountsOf(u)) {
            accounts.push({
                id: newId(),
                accountId: social.accountId,
                providerId: social.providerId,
                userId: u.id,
                createdAt: created,
                updatedAt: updated,
            });
            c.count(`social.${social.providerId}`);
        }
        if ((u.mfa_verifications ?? []).length > 0) c.count('mfa_dropped');

        const name =
            (u.name || u.username || (email ?? '').split('@')[0] || u.id)
                .trim()
                .slice(0, NAME_MAX) || u.id;
        const labels = strings(row.labels);
        c.count('profile_labels', labels.length);
        imported.set(u.id, {
            user: {
                id: u.id,
                name,
                email: email ?? '',
                emailVerified: true,
                image: null,
                role: email === admin ? 'admin' : 'user',
                createdAt: created,
                updatedAt: updated,
            },
            profile: {
                userId: u.id,
                username,
                metadata,
                labels,
                updatedAt: updated,
            },
            accounts,
        });
    }
    if (admin && ![...imported.values()].some((i) => i.user.email === admin)) {
        throw new ImportInputError(
            `--admin ${admin} is not among the imported users`
        );
    }
    c.count('imported_users', imported.size);

    const studysets: (typeof studyset.$inferInsert)[] = [];
    const seen = new Set<string>();
    const owners = new Set<string>();
    for (const item of src.dynamo.main) {
        const pk = typeof item.PK === 'string' ? item.PK : '';
        const sk = typeof item.SK === 'string' ? item.SK : '';
        if (!pk.startsWith('userUUID#') || !sk.startsWith('studyset#')) {
            c.flag('unknown_item', `${pk}|${sk}`);
            continue;
        }
        const id = sk.slice('studyset#'.length);
        const ownerId = pk.slice('userUUID#'.length);
        if (!isStudysetUUID(id)) {
            c.flag('invalid_set_id', id);
            continue;
        }
        // An upsert stub (hosted isRealStudysetItem): no cards, no title.
        if (item.studysetUUID !== id) {
            c.flag(item.labels !== undefined ? 'stub_set_labeled' : 'stub_set', id);
            continue;
        }
        if (skipped.has(ownerId)) {
            c.count('skipped_user_set');
            continue;
        }
        const owner = imported.get(ownerId);
        if (!owner) {
            c.flag('orphan_set', id, ownerId);
            continue;
        }
        if (seen.has(id)) {
            c.flag('duplicate_set', id);
            continue;
        }
        seen.add(id);
        owners.add(ownerId);

        let createdAt = parseDate(item.createdAt);
        if (!createdAt) {
            c.flag('bad_timestamp', id, 'createdAt');
            createdAt = now;
        }
        const later = (field: string) => {
            const d = parseDate(item[field]);
            if (!d && item[field] !== undefined) c.flag('bad_timestamp', id, field);
            return d ?? createdAt;
        };
        const updatedAt = later('updatedAt');
        const lastViewed = later('lastViewed');

        const state = mapPublishState(item, updatedAt);
        for (const a of state.anomalies) c.flag(a, id);

        let metadata: JsonObject = { ...DEFAULT_STUDYSET_METADATA };
        if (item.metadata !== undefined) {
            if (isPlainObject(item.metadata) && isStorableValue(item.metadata)) {
                metadata = { ...item.metadata };
            } else {
                c.flag('bad_set_metadata', id);
            }
        }
        metadata.publiclyViewable = state.isPublic;

        let cards: JsonObject[] = [];
        if (item.cards !== undefined) {
            if (
                Array.isArray(item.cards) &&
                isStorableValue(item.cards) &&
                !collectCardFileKeys(item.cards).malformed
            ) {
                cards = item.cards as JsonObject[];
            } else {
                c.flag('bad_cards', id);
            }
        }
        cards = planCardFiles(cards, id, o.probe, newId, copies, c);

        const copiedFrom = isPlainObject(item.copiedFrom)
            ? item.copiedFrom.studysetUUID
            : undefined;
        const saveCount =
            typeof item.saveCount === 'number' &&
            Number.isInteger(item.saveCount) &&
            item.saveCount >= 0
                ? item.saveCount
                : 0;
        const labels = strings(item.labels);
        c.count('set_label_assignments', labels.length);

        studysets.push({
            studysetUUID: id,
            ownerId,
            username: owner.profile.username ?? null,
            title: typeof item.title === 'string' ? item.title : 'Untitled Studyset',
            description: typeof item.description === 'string' ? item.description : '',
            favorited: item.favorited === true,
            cards,
            categories: strings(item.categories),
            labels,
            metadata,
            lastViewed,
            createdAt,
            updatedAt,
            subject: state.subject,
            isPublic: state.isPublic,
            publishedAt: state.publishedAt,
            featuredAt: state.featuredAt,
            hiddenAt: state.hiddenAt,
            saveCount,
            copiedFrom: isStudysetUUID(copiedFrom) ? copiedFrom : null,
        });
        c.count('sets_imported');
        const listed = state.isPublic && state.publishedAt !== null && state.hiddenAt === null;
        if (listed) c.count('sets_listed');
        if (state.featuredAt) c.count('sets_featured');
        if (state.hiddenAt) c.count('sets_hidden');
        if (!state.isPublic && state.publishedAt && !state.hiddenAt) c.count('sets_published_unlisted');
    }
    c.count('users_without_sets', [...imported.keys()].filter((id) => !owners.has(id)).length);

    return {
        users: [...imported.values()],
        studysets,
        copies: [...copies].map(([to, from]) => ({ from, to })),
        report: { counts: c.counts, anomalies: c.anomalies },
    };
}

// Rekeys legacy and foreign card files under this set, then resolves each unique
// final key once: copy it when the sync has the file, else keep the original key
// with no URL so the card still renders.
function planCardFiles(
    cards: JsonObject[],
    studysetUUID: string,
    probe: Probe,
    newId: () => string,
    copies: Map<string, string>,
    c: Collector
): JsonObject[] {
    const planned = planCardFileCopies(
        cards,
        studysetUUID,
        (key) => !(isCardFileKey(key) && studysetUUIDOfKey(key) === studysetUUID),
        () => `${studysetUUID}/${newId()}`
    );
    const sourceOf = new Map(planned.copies.map((copy) => [copy.to, copy.from]));
    const resolved = new Map<string, { key: string; url: string }>();
    const resolve = (key: string) => {
        let hit = resolved.get(key);
        if (hit) return hit;
        const source = sourceOf.get(key) ?? key;
        const rekeyed = sourceOf.has(key);
        if (isUnsafeS3Key(source)) {
            c.flag('unsafe_file_key', studysetUUID, source);
            hit = { key: source, url: '' };
        } else {
            const found = probe(source);
            if (found) {
                if (!copies.has(key)) copies.set(key, found.path);
                c.count(rekeyed ? 'files_rekeyed' : 'files_copied');
                hit = { key, url: fileURL(key) };
            } else {
                c.flag('missing_file', studysetUUID, source);
                hit = { key: source, url: '' };
            }
        }
        resolved.set(key, hit);
        return hit;
    };
    return planned.cards.map((card) =>
        Array.isArray(card.files)
            ? {
                  ...card,
                  files: card.files.map((file: unknown) => {
                      if (!isPlainObject(file)) return file;
                      const { key } = file;
                      if (typeof key !== 'string' || key === '') return file;
                      const hit = resolve(key);
                      return { ...file, key: hit.key, signedURL: hit.url };
                  }),
              }
            : card
    );
}
