import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    StudySessionState,
    StudyAnswer,
    CardProgress,
    StudySessionResult,
    StudyStatistics,
    Achievement,
    StudysetProgress,
} from 'shared/types';

type StudySessionStore = {
    // Active session
    activeSession: StudySessionState | null;

    // Progress tracking
    cardProgress: Map<string, CardProgress>;

    // Statistics
    statistics: StudyStatistics;

    // Actions
    startSession: (config: Partial<StudySessionState>) => void;
    endSession: () => StudySessionResult | null;
    updateCurrentCard: (index: number) => void;
    recordAnswer: (answer: StudyAnswer) => void;
    incrementScore: (points: number) => void;
    updateStreak: (correct: boolean) => void;
    resetSession: () => void;

    // Progress management (SM-2 algorithm)
    updateCardProgress: (cardUUID: string, quality: number) => void;
    getNextReviewCards: (studysetUUID: string) => string[];

    // Statistics
    recordSessionResult: (result: StudySessionResult) => void;
    unlockAchievement: (achievementId: string) => void;
};

export const useStudySessionStore = create<StudySessionStore>()(
    persist(
        (set, get) => ({
            activeSession: null,
            cardProgress: new Map(),
            statistics: {
                totalSessions: 0,
                totalCardsStudied: 0,
                averageAccuracy: 0,
                totalTimeSpent: 0,
                achievements: [],
                progressByStudyset: new Map(),
            },

            startSession: (config) =>
                set({
                    activeSession: {
                        currentCardIndex: 0,
                        answers: [],
                        score: 0,
                        streak: 0,
                        maxStreak: 0,
                        startTime: new Date().toISOString(),
                        ...config,
                    } as StudySessionState,
                }),

            endSession: () => {
                const session = get().activeSession;
                if (!session) return null;

                const endTime = new Date();
                const startTime = new Date(session.startTime);
                const timeSpent = (endTime.getTime() - startTime.getTime()) / 1000;

                const correctAnswers = session.answers.filter((a) => a.correct).length;
                const accuracy = session.answers.length > 0 ? (correctAnswers / session.answers.length) * 100 : 0;

                const result: StudySessionResult = {
                    sessionUUID: crypto.randomUUID(),
                    studysetUUID: session.studysetUUID,
                    mode: session.mode,
                    totalCards: session.cards.length,
                    correctAnswers,
                    score: session.score,
                    timeSpent,
                    accuracy,
                    streak: session.maxStreak,
                    completedAt: endTime.toISOString(),
                    achievements: [],
                };

                get().recordSessionResult(result);
                set({ activeSession: null });
                return result;
            },

            updateCurrentCard: (index) =>
                set((state) => ({
                    activeSession: state.activeSession
                        ? { ...state.activeSession, currentCardIndex: index }
                        : null,
                })),

            recordAnswer: (answer) =>
                set((state) => ({
                    activeSession: state.activeSession
                        ? {
                              ...state.activeSession,
                              answers: [...state.activeSession.answers, answer],
                          }
                        : null,
                })),

            incrementScore: (points) =>
                set((state) => ({
                    activeSession: state.activeSession
                        ? {
                              ...state.activeSession,
                              score: state.activeSession.score + points,
                          }
                        : null,
                })),

            updateStreak: (correct) =>
                set((state) => {
                    if (!state.activeSession) return {};
                    const newStreak = correct ? state.activeSession.streak + 1 : 0;
                    return {
                        activeSession: {
                            ...state.activeSession,
                            streak: newStreak,
                            maxStreak: Math.max(state.activeSession.maxStreak, newStreak),
                        },
                    };
                }),

            resetSession: () => set({ activeSession: null }),

            // SM-2 Spaced Repetition Algorithm
            updateCardProgress: (cardUUID, quality) => {
                const existing = get().cardProgress.get(cardUUID);
                const progress: CardProgress = existing || {
                    cardUUID,
                    lastStudied: new Date().toISOString(),
                    nextReview: new Date().toISOString(),
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    masteryLevel: 'new' as const,
                };

                let { easeFactor, interval, repetitions } = progress;

                // SM-2 algorithm calculations
                if (quality >= 3) {
                    // Correct response
                    if (repetitions === 0) {
                        interval = 1;
                    } else if (repetitions === 1) {
                        interval = 6;
                    } else {
                        interval = Math.round(interval * easeFactor);
                    }
                    repetitions += 1;
                } else {
                    // Incorrect response - reset
                    repetitions = 0;
                    interval = 1;
                }

                // Update ease factor based on quality
                easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
                easeFactor = Math.max(1.3, easeFactor); // Minimum ease factor of 1.3

                // Calculate next review date
                const nextReview = new Date();
                nextReview.setDate(nextReview.getDate() + interval);

                // Determine mastery level
                const masteryLevel: CardProgress['masteryLevel'] =
                    repetitions >= 5 ? 'mastered' : repetitions >= 2 ? 'review' : repetitions >= 1 ? 'learning' : 'new';

                const updatedProgress: CardProgress = {
                    ...progress,
                    lastStudied: new Date().toISOString(),
                    nextReview: nextReview.toISOString(),
                    easeFactor,
                    interval,
                    repetitions,
                    masteryLevel,
                };

                set((state) => {
                    const newMap = new Map(state.cardProgress);
                    newMap.set(cardUUID, updatedProgress);
                    return { cardProgress: newMap };
                });
            },

            getNextReviewCards: (studysetUUID) => {
                const now = new Date();
                return Array.from(get().cardProgress.values())
                    .filter((p) => new Date(p.nextReview) <= now)
                    .map((p) => p.cardUUID);
            },

            recordSessionResult: (result) => {
                set((state) => {
                    const newTotalSessions = state.statistics.totalSessions + 1;
                    const newAverageAccuracy =
                        (state.statistics.averageAccuracy * state.statistics.totalSessions + result.accuracy) /
                        newTotalSessions;

                    return {
                        statistics: {
                            ...state.statistics,
                            totalSessions: newTotalSessions,
                            totalCardsStudied: state.statistics.totalCardsStudied + result.totalCards,
                            totalTimeSpent: state.statistics.totalTimeSpent + result.timeSpent,
                            averageAccuracy: newAverageAccuracy,
                        },
                    };
                });
            },

            unlockAchievement: (achievementId) => {
                const existing = get().statistics.achievements.find((a) => a.id === achievementId);
                if (existing) return;

                const newAchievement: Achievement = {
                    id: achievementId,
                    unlockedAt: new Date().toISOString(),
                    title: achievementId,
                    description: '',
                    icon: '',
                };

                set((state) => ({
                    statistics: {
                        ...state.statistics,
                        achievements: [...state.statistics.achievements, newAchievement],
                    },
                }));
            },
        }),
        {
            name: 'study-session-storage',
            partialize: (state) => ({
                cardProgress: Array.from(state.cardProgress.entries()),
                statistics: {
                    ...state.statistics,
                    progressByStudyset: Array.from(state.statistics.progressByStudyset.entries()),
                },
            }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as any;
                return {
                    ...currentState,
                    cardProgress: new Map(persisted.cardProgress || []),
                    statistics: {
                        ...currentState.statistics,
                        ...persisted.statistics,
                        progressByStudyset: new Map(persisted.statistics?.progressByStudyset || []),
                    },
                };
            },
        }
    )
);
