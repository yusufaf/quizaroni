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
    GetUserResponseSchema,
    UserMetadataSchema,
} from './schemas';

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
