import { sql } from 'drizzle-orm';
import {
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const instanceSettings = sqliteTable('instance_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// `user` and `account` use Better Auth's field names (plus the admin plugin's
// `role`) so the auth slice can adopt these tables as they are.
export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
        .notNull()
        .default(false),
    image: text('image'),
    role: text('role').notNull().default('user'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const account = sqliteTable(
    'account',
    {
        id: text('id').primaryKey(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: integer('access_token_expires_at', {
            mode: 'timestamp_ms',
        }),
        refreshTokenExpiresAt: integer('refresh_token_expires_at', {
            mode: 'timestamp_ms',
        }),
        scope: text('scope'),
        password: text('password'),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    },
    (t) => [index('account_user_id_idx').on(t.userId)]
);

export const session = sqliteTable(
    'session',
    {
        id: text('id').primaryKey(),
        expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
        token: text('token').notNull().unique(),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
    },
    (t) => [index('session_user_id_idx').on(t.userId)]
);

export const verification = sqliteTable(
    'verification',
    {
        id: text('id').primaryKey(),
        identifier: text('identifier').notNull(),
        value: text('value').notNull(),
        expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    },
    (t) => [index('verification_identifier_idx').on(t.identifier)]
);

// Quizaroni's own per-user data, kept out of Better Auth's `user` row. NOCASE
// makes `Alice` and `alice` the same username; NULL (no username yet) repeats.
export const userProfile = sqliteTable(
    'user_profile',
    {
        userId: text('user_id')
            .primaryKey()
            .references(() => user.id, { onDelete: 'cascade' }),
        username: text('username'),
        metadata: text('metadata', { mode: 'json' })
            .$type<Record<string, unknown>>()
            .notNull(),
        labels: text('labels', { mode: 'json' }).$type<string[]>().notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    },
    (t) => [
        uniqueIndex('user_profile_username_unique').on(
            sql`${t.username} COLLATE NOCASE`
        ),
    ]
);

// Cards stay nested in the set, as in DynamoDB. The id no longer implies the
// owner, so every query also filters on owner_id.
export const studyset = sqliteTable(
    'studyset',
    {
        studysetUUID: text('studyset_uuid').primaryKey(),
        ownerId: text('owner_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        username: text('username'),
        title: text('title').notNull(),
        description: text('description').notNull(),
        favorited: integer('favorited', { mode: 'boolean' }).notNull(),
        cards: text('cards', { mode: 'json' })
            .$type<Record<string, unknown>[]>()
            .notNull(),
        categories: text('categories', { mode: 'json' })
            .$type<string[]>()
            .notNull(),
        labels: text('labels', { mode: 'json' }).$type<string[]>().notNull(),
        metadata: text('metadata', { mode: 'json' })
            .$type<Record<string, unknown>>()
            .notNull(),
        lastViewed: integer('last_viewed', { mode: 'timestamp_ms' }).notNull(),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
        // Publishing. A set is listed publicly only when it's public, has been
        // published and isn't hidden. publishedAt keeps the first publish time
        // across an unpublish, so it can't be the listed flag on its own.
        subject: text('subject'),
        isPublic: integer('is_public', { mode: 'boolean' })
            .notNull()
            .default(false),
        publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
        featuredAt: integer('featured_at', { mode: 'timestamp_ms' }),
        hiddenAt: integer('hidden_at', { mode: 'timestamp_ms' }),
        saveCount: integer('save_count').notNull().default(0),
        // No FK: the source may be deleted.
        copiedFrom: text('copied_from'),
    },
    (t) => [
        index('studyset_owner_created_idx').on(t.ownerId, t.createdAt),
        index('studyset_published_idx').on(t.publishedAt, t.studysetUUID),
        index('studyset_featured_idx').on(t.featuredAt),
        index('studyset_hidden_idx').on(t.hiddenAt),
        index('studyset_save_count_idx').on(t.saveCount),
    ]
);
