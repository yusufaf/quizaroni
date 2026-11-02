// Database
export {
    getDatabase,
    resetDatabase,
    exportAllData,
    importAllData,
    hasPendingSync,
    getPendingSyncCount,
    type LocalStudyset,
    type LocalUser,
    type LocalStudySession,
    type LocalCardProgress,
} from './db';

// Local data ownership (logout / account switch)
export {
    clearLocalData,
    claimLocalData,
    hasUnsyncedLocalChanges,
    resetLocalGamification,
} from './localData';

// Repositories
export {
    studysetRepository,
    userRepository,
    cardProgressRepository,
    StudysetRepository,
    UserRepository,
    CardProgressRepository,
} from './repositories';

// Sync Engine
export {
    SyncEngine,
    getSyncEngine,
    resetSyncEngine,
    type SyncOptions,
} from './sync/SyncEngine';

// Hooks
export { useSync } from './hooks/useSync';
export * from './hooks';

// PWA
export {
    registerServiceWorker,
    unregisterServiceWorker,
    skipWaiting,
} from './pwa/registerSW';

// Components
export { SyncStatusIndicator, GlobalSyncInitializer } from './components';

// API
export { syncApiClient } from './api/syncApiClient';
