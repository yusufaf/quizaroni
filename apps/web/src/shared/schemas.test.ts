import {
    CLIENT_EDITABLE_USER_METADATA_KEYS,
    SERVER_MANAGED_USER_METADATA_KEYS,
} from '@quizaroni/shared-types';
import { describe, expect, it } from 'vite-plus/test';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    DEFAULT_USER_DATA,
} from 'shared/constants';
import {
    EditableUserMetadataSchema,
    GetAllStudysetsResponseSchema,
    GetUserResponseSchema,
    UserMetadataSchema,
} from './schemas';

// Logto user ids are 12-character strings, not UUIDs.
const LOGTO_USER_ID = 'a1b2c3d4e5f6';
const NOW = '2026-10-27T05:49:52.225Z';

describe('stored record shapes', () => {
    it('accepts a Logto user who signed up without a username', () => {
        const result = GetUserResponseSchema.safeParse({
            message: 'ok',
            user: {
                ...DEFAULT_USER_DATA,
                createdAt: NOW,
                email: 'user@example.com',
                userUUID: LOGTO_USER_ID,
                username: null,
            },
        });

        expect(result.error?.issues).toBeUndefined();
    });

    it('accepts a seeded study set as get-all-studysets returns it', () => {
        const result = GetAllStudysetsResponseSchema.safeParse({
            studysets: [
                {
                    cards: [],
                    categories: [],
                    createdAt: NOW,
                    description: '',
                    favorited: false,
                    labels: [],
                    lastViewed: NOW,
                    metadata: {
                        backgroundColorVisible: false,
                        cardCountVisible: true,
                        contentOnly: false,
                        customLabelTerminology: '',
                        customTerminology: '',
                        labelTerminology: 'Card',
                        notesDrawerInitial: 'open',
                        notesDrawerPosition: 'right',
                        publiclyViewable: true,
                        terminology: 'Term/Definition',
                        textColorVisible: false,
                    },
                    publishedAt: NOW,
                    // The seed script derives v5 ids (seedStudysetUUID).
                    studysetUUID: '5a1e7c3b-2d4f-5e6a-8b9c-0d1e2f3a4b5c',
                    subject: 'math',
                    title: 'Cell biology',
                    username: 'turtles',
                    userUUID: LOGTO_USER_ID,
                },
            ],
        });

        expect(result.error?.issues).toBeUndefined();
    });
});

describe('UserMetadataSchema', () => {
    // A key missing here is stripped when the user loads (#207).
    it('covers exactly the shared client-editable and server-managed keys', () => {
        expect(Object.keys(UserMetadataSchema.shape).sort()).toEqual(
            [
                ...CLIENT_EDITABLE_USER_METADATA_KEYS,
                ...SERVER_MANAGED_USER_METADATA_KEYS,
            ].sort()
        );
    });

    it('keeps the haptics and AI settings when a user loads', () => {
        const metadata = {
            ...DEFAULT_USER_DATA.metadata,
            hapticsEnabled: false,
            aiProvider: 'anthropic',
            aiModel: 'some-model',
        };

        const parsed = GetUserResponseSchema.parse({
            message: 'ok',
            user: {
                ...DEFAULT_USER_DATA,
                email: 'user@example.com',
                userUUID: '00000000-0000-4000-8000-000000000000',
                metadata,
            },
        });

        expect(parsed.user.metadata).toMatchObject({
            hapticsEnabled: false,
            aiProvider: 'anthropic',
            aiModel: 'some-model',
        });
    });
});

describe('EditableUserMetadataSchema', () => {
    // Valid values, so only the key itself can be what's rejected.
    it.each([
        [
            'gamification',
            {
                currentStreak: 1,
                longestStreak: 1,
                lastStudyDate: null,
                unlockedAchievementIds: [],
                unlockedAtById: {},
                studiedStudysetUUIDs: [],
                studysetSessionCounts: {},
            },
        ],
        ['customAchievements', []],
        ['notifications', DEFAULT_NOTIFICATION_PREFERENCES],
    ])('rejects %s (#207)', (key, value) => {
        expect(
            UserMetadataSchema.shape[
                key as keyof typeof UserMetadataSchema.shape
            ].safeParse(value).success
        ).toBe(true);
        expect(
            EditableUserMetadataSchema.safeParse({ [key]: value }).success
        ).toBe(false);
    });

    it('accepts a client-editable key', () => {
        expect(
            EditableUserMetadataSchema.safeParse({ defaultTheme: 'light' })
                .success
        ).toBe(true);
    });
});
