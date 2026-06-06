import {
    getDatabase,
    type LocalCustomAchievement,
    type LocalGamificationRecord,
} from '../db';
import { GAMIFICATION_DB_ID } from 'shared/constants';
import type { CustomAchievement, GamificationState } from 'shared/types';
import { createInitialGamificationState } from 'shared/utilities/gamification';

export class GamificationRepository {
    private db = getDatabase();

    async getState(): Promise<LocalGamificationRecord> {
        const existing = await this.db.gamification.get(GAMIFICATION_DB_ID);
        if (existing) return existing;

        const initial: LocalGamificationRecord = {
            id: GAMIFICATION_DB_ID,
            ...createInitialGamificationState(),
            _lastModified: Date.now(),
        };
        await this.db.gamification.put(initial);
        return initial;
    }

    async saveState(state: GamificationState): Promise<void> {
        const record: LocalGamificationRecord = {
            id: GAMIFICATION_DB_ID,
            ...state,
            _lastModified: Date.now(),
        };
        await this.db.gamification.put(record);
    }

    async getCustomAchievements(): Promise<LocalCustomAchievement[]> {
        return await this.db.customAchievements.toArray();
    }

    async saveCustomAchievement(
        achievement: CustomAchievement
    ): Promise<LocalCustomAchievement> {
        const record: LocalCustomAchievement = {
            ...achievement,
            _lastModified: Date.now(),
        };
        await this.db.customAchievements.put(record);
        return record;
    }

    async deleteCustomAchievement(id: string): Promise<void> {
        await this.db.customAchievements.delete(id);
    }
}

export const gamificationRepository = new GamificationRepository();
