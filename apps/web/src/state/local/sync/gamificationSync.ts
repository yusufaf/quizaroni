import { BASE_API_URL, getCommonPostRequestProps } from 'state/api/awsAPI';
import { validate } from 'shared/validation';
import { UpdateGamificationResponseSchema } from 'shared/schemas';
import type {
    CustomAchievement,
    GamificationState,
    User,
} from 'shared/types';
import {
    createInitialGamificationState,
    mergeCustomAchievements,
    mergeGamificationState,
} from 'shared/utilities/gamification';

export type GamificationPayload = {
    state: GamificationState;
    customAchievements: CustomAchievement[];
};

export async function pushGamificationToServer(
    payload: GamificationPayload
): Promise<GamificationPayload | null> {
    if (!navigator.onLine) return null;

    try {
        const response = await fetch(
            `${BASE_API_URL}/users/update-gamification`,
            {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({
                    gamification: payload.state,
                    customAchievements: payload.customAchievements,
                }),
            }
        );

        if (!response.ok) {
            console.error('Failed to sync gamification:', response.status);
            return null;
        }

        const data = await response.json();
        const validated = validate({
            schema: UpdateGamificationResponseSchema,
            data,
            type: 'response',
            context: 'UpdateGamification',
        });

        return {
            state: validated.gamification,
            customAchievements: validated.customAchievements,
        };
    } catch (error) {
        console.error('Error syncing gamification:', error);
        return null;
    }
}

export function mergeGamificationFromUser(
    local: GamificationPayload,
    user: User
): GamificationPayload {
    const remoteState =
        user.metadata.gamification ?? createInitialGamificationState();
    const remoteCustom = user.metadata.customAchievements ?? [];

    return {
        state: mergeGamificationState(local.state, remoteState),
        customAchievements: mergeCustomAchievements(
            local.customAchievements,
            remoteCustom
        ),
    };
}
