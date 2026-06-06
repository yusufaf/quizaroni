import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    GAMIFICATION_STORAGE_KEY,
    PRESET_ACHIEVEMENTS,
} from 'shared/constants';
import type {
    Achievement,
    CustomAchievement,
    GamificationState,
    StudySessionResult,
    StudyStatistics,
} from 'shared/types';
import {
    applySessionToGamification,
    createInitialGamificationState,
    evaluateCustomAchievements,
    evaluatePresetAchievements,
} from 'shared/utilities/gamification';
import { gamificationRepository } from 'state/local/repositories/GamificationRepository';
import {
    mergeGamificationFromUser,
    pushGamificationToServer,
} from 'state/local/sync/gamificationSync';
import type { User } from 'shared/types';

type GamificationStore = {
    state: GamificationState;
    customAchievements: CustomAchievement[];
    hydrated: boolean;
    syncPending: boolean;

    hydrateFromDb: () => Promise<void>;
    syncFromServer: (user: User) => Promise<void>;
    retryPendingSync: () => Promise<void>;
    processSessionEnd: (
        session: StudySessionResult,
        statistics: StudyStatistics
    ) => StudySessionResult;
    addCustomAchievement: (
        achievement: Omit<CustomAchievement, 'id' | 'createdAt'>
    ) => void;
    removeCustomAchievement: (id: string) => void;
    getAchievementById: (id: string) => Achievement | undefined;
    getAllAchievements: () => Achievement[];
};

const buildPresetAchievement = (id: string, unlockedAt: string): Achievement => {
    const preset = Object.values(PRESET_ACHIEVEMENTS).find((p) => p.id === id);
    return {
        id,
        unlockedAt,
        title: preset?.i18nKey ?? id,
        description: preset?.i18nKey ?? id,
        icon: preset?.icon ?? '🏅',
        isCustom: false,
    };
};

const persistToDb = async (
    state: GamificationState,
    customAchievements: CustomAchievement[]
) => {
    await gamificationRepository.saveState(state);
    await Promise.all(
        customAchievements.map((a) =>
            gamificationRepository.saveCustomAchievement(a)
        )
    );
};

const applyPayload = (
    set: (
        partial:
            | Partial<GamificationStore>
            | ((state: GamificationStore) => Partial<GamificationStore>)
    ) => void,
    state: GamificationState,
    customAchievements: CustomAchievement[],
    syncPending = false
) => {
    set({ state, customAchievements, syncPending });
};

const syncToServer = async (
    get: () => GamificationStore,
    set: (
        partial:
            | Partial<GamificationStore>
            | ((state: GamificationStore) => Partial<GamificationStore>)
    ) => void
) => {
    const { state, customAchievements } = get();
    const merged = await pushGamificationToServer({
        state,
        customAchievements,
    });

    if (merged) {
        await persistToDb(merged.state, merged.customAchievements);
        applyPayload(set, merged.state, merged.customAchievements, false);
        return;
    }

    set({ syncPending: true });
};

export const useGamificationStore = create<GamificationStore>()(
    persist(
        (set, get) => ({
            state: createInitialGamificationState(),
            customAchievements: [],
            hydrated: false,
            syncPending: false,

            hydrateFromDb: async () => {
                const [dbState, custom] = await Promise.all([
                    gamificationRepository.getState(),
                    gamificationRepository.getCustomAchievements(),
                ]);
                const { id: _id, _lastModified: _lm, ...state } = dbState;
                set({
                    state: {
                        ...createInitialGamificationState(),
                        ...state,
                        unlockedAtById: state.unlockedAtById ?? {},
                    },
                    customAchievements: custom.map(
                        ({ _lastModified: __lm, ...achievement }) => achievement
                    ),
                    hydrated: true,
                });
            },

            syncFromServer: async (user) => {
                if (!get().hydrated) {
                    await get().hydrateFromDb();
                }

                const local = get();
                const merged = mergeGamificationFromUser(
                    {
                        state: local.state,
                        customAchievements: local.customAchievements,
                    },
                    user
                );

                await persistToDb(merged.state, merged.customAchievements);
                applyPayload(set, merged.state, merged.customAchievements);
                await syncToServer(get, set);
            },

            retryPendingSync: async () => {
                if (!get().syncPending) return;
                await syncToServer(get, set);
            },

            processSessionEnd: (session, statistics) => {
                const prev = get();
                const updatedState = applySessionToGamification(
                    prev.state,
                    session
                );

                const context = {
                    gamification: updatedState,
                    statistics,
                    session,
                };

                const presetUnlocked = evaluatePresetAchievements(context);
                const { unlockedIds: customUnlocked, updated: updatedCustom } =
                    evaluateCustomAchievements(
                        context,
                        prev.customAchievements
                    );

                const allNewIds = [...presetUnlocked, ...customUnlocked];
                const now = new Date().toISOString();
                const unlockedAtById = { ...updatedState.unlockedAtById };
                for (const id of allNewIds) {
                    unlockedAtById[id] = now;
                }
                const finalState: GamificationState = {
                    ...updatedState,
                    unlockedAchievementIds: [
                        ...updatedState.unlockedAchievementIds,
                        ...allNewIds,
                    ],
                    unlockedAtById,
                };

                set({
                    state: finalState,
                    customAchievements: updatedCustom,
                });

                void persistToDb(finalState, updatedCustom).then(() =>
                    syncToServer(get, set)
                );

                return {
                    ...session,
                    achievements: allNewIds,
                };
            },

            addCustomAchievement: (achievement) => {
                const newAchievement: CustomAchievement = {
                    ...achievement,
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                };
                set((prev) => ({
                    customAchievements: [
                        ...prev.customAchievements,
                        newAchievement,
                    ],
                }));
                void gamificationRepository
                    .saveCustomAchievement(newAchievement)
                    .then(() => syncToServer(get, set));
            },

            removeCustomAchievement: (id) => {
                set((prev) => ({
                    customAchievements: prev.customAchievements.filter(
                        (a) => a.id !== id
                    ),
                }));
                void gamificationRepository
                    .deleteCustomAchievement(id)
                    .then(() => syncToServer(get, set));
            },

            getAchievementById: (id) => {
                const { state, customAchievements } = get();
                const preset = Object.values(PRESET_ACHIEVEMENTS).find(
                    (p) => p.id === id
                );
                if (preset && state.unlockedAchievementIds.includes(id)) {
                    return buildPresetAchievement(
                        id,
                        state.unlockedAtById[id] ?? nowFallback()
                    );
                }

                const custom = customAchievements.find((a) => a.id === id);
                if (custom?.unlockedAt) {
                    return {
                        id: custom.id,
                        unlockedAt: custom.unlockedAt,
                        title: custom.title,
                        description: custom.description,
                        icon: custom.icon,
                        isCustom: true,
                    };
                }
                return undefined;
            },

            getAllAchievements: () => {
                const { state, customAchievements } = get();
                const preset = state.unlockedAchievementIds
                    .filter((id) =>
                        Object.values(PRESET_ACHIEVEMENTS).some(
                            (p) => p.id === id
                        )
                    )
                    .map((id) =>
                        buildPresetAchievement(
                            id,
                            state.unlockedAtById[id] ?? nowFallback()
                        )
                    );

                const custom = customAchievements
                    .filter((a) => a.unlockedAt)
                    .map(
                        (a): Achievement => ({
                            id: a.id,
                            unlockedAt: a.unlockedAt!,
                            title: a.title,
                            description: a.description,
                            icon: a.icon,
                            isCustom: true,
                        })
                    );

                return [...preset, ...custom];
            },
        }),
        {
            name: GAMIFICATION_STORAGE_KEY,
            partialize: (store) => ({
                state: store.state,
                customAchievements: store.customAchievements,
                syncPending: store.syncPending,
            }),
        }
    )
);

const nowFallback = () => new Date().toISOString();
