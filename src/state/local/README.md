# Local-First Data Layer

This module provides a local-first architecture for Quizaroni using Dexie.js (IndexedDB). Data is stored locally by default, with optional synchronization to a backend.

## Architecture

```
┌─────────────────────────────────────────┐
│           React UI Layer                │
│     (uses hybrid hooks or repositories)   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Repository Pattern (Data Layer)    │
│  ┌─────────────┐    ┌─────────────┐    │
│  │ LocalStore  │◄──►│  SyncEngine │    │
│  │  (Dexie.js) │    │  (optional) │    │
│  └─────────────┘    └──────┬──────┘    │
└─────────────────────────────┼───────────┘
                              │ (optional)
                    ┌─────────▼──────────┐
                    │   Backend API      │
                    └────────────────────┘
```

## Quick Start

### 1. Register Service Worker (PWA Support)

```tsx
// In index.tsx or App.tsx
import { registerServiceWorker, getSyncEngine } from 'state/local';

// Register PWA service worker
registerServiceWorker();

// Initialize sync engine with your API client
const syncEngine = getSyncEngine({
    apiClient: {
        updateStudyset: async (uuid, updates) => {
            // Your API call here
        },
        createStudyset: async (studyset) => {
            // Your API call here
        },
        deleteStudyset: async (uuid) => {
            // Your API call here
        },
        updateUserMetadata: async (updates) => {
            // Your API call here
        },
    },
    enabled: true,
    pollInterval: 30000, // Sync every 30 seconds
});

// Start sync polling
syncEngine.start();
```

### 2. Use Hybrid Hooks (Recommended)

Replace existing API hooks with hybrid versions that work offline:

```tsx
// Old: import { useGetAllStudysets } from 'state/api/studysetsAPI';
// New:
import { useHybridGetAllStudysets, useHybridUpdateStudyset } from 'state/local';

function MyComponent() {
    // Reads from local DB, syncs to backend automatically
    const { data, isLoading } = useHybridGetAllStudysets();

    const updateMutation = useHybridUpdateStudyset();

    const handleUpdate = async (uuid, changes) => {
        // Updates local DB immediately, syncs in background
        await updateMutation.mutateAsync({
            studysetUUID: uuid,
            updates: changes,
        });
    };
}
```

### 3. Monitor Sync Status

```tsx
import { useSync } from 'state/local';

function SyncIndicator() {
    const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();

    return (
        <div>
            {!isOnline && <span>Offline</span>}
            {isSyncing && <span>Syncing...</span>}
            {pendingCount > 0 && (
                <span onClick={triggerSync}>
                    {pendingCount} pending changes
                </span>
            )}
        </div>
    );
}
```

## API

### Repositories (Direct Access)

Use repositories for direct database operations:

```tsx
import { studysetRepository, userRepository } from 'state/local';

// Create studyset locally
const newStudyset = await studysetRepository.create({
    studysetUUID: crypto.randomUUID(),
    title: 'My Studyset',
    // ... other fields
});

// Query
const allStudysets = await studysetRepository.getAll();
const userStudysets = await studysetRepository.getByUser(userUUID);
const searchResults = await studysetRepository.search('query');

// Update
await studysetRepository.update(studysetUUID, { title: 'New Title' });

// Delete (queues for sync if previously synced)
await studysetRepository.delete(studysetUUID);
```

### Database Operations

```tsx
import { getDatabase, exportAllData, importAllData, resetDatabase } from 'state/local';

// Get raw database instance
const db = getDatabase();

// Export all data (for backup/migration)
const data = await exportAllData();

// Import data
await importAllData({
  studysets: [...],
  users: [...],
  sessions: [...],
  cardProgress: [...],
});

// Reset (logout / clear all data)
await resetDatabase();
```

### Sync Engine

```tsx
import { getSyncEngine, resetSyncEngine } from 'state/local';

const syncEngine = getSyncEngine();

// Subscribe to status changes
const unsubscribe = syncEngine.subscribe((state) => {
    console.log('Sync status:', state.status);
    console.log('Pending:', state.pendingCount);
    console.log('Last sync:', state.lastSyncAt);
});

// Manual sync
await syncEngine.forceSync();

// Start/stop polling
syncEngine.start();
syncEngine.stop();

// Change options
syncEngine.setOptions({ enabled: false }); // Disable sync

// Reset
resetSyncEngine();
```

## Modes of Operation

### 1. Pure Local Mode (No Backend)

```tsx
const syncEngine = getSyncEngine({
    apiClient: null,
    enabled: false,
});
// All data stays in browser only
```

### 2. Local-First with Sync (Default)

```tsx
const syncEngine = getSyncEngine({
  apiClient: { ... },
  enabled: true,
});
// Data saved locally immediately, synced to backend when possible
```

### 3. API-First with Local Cache

Use the traditional hooks from `state/api/*` - they still work as before.

## Data Types

### Local Studyset

```tsx
type LocalStudyset = Studyset & {
    _syncStatus: 'synced' | 'pending' | 'conflict';
    _lastModified: number;
    _localOnly?: boolean;
};
```

### Sync Queue

Operations that failed to sync are stored in `syncQueue` table for retry:

```tsx
interface SyncQueueItem {
    id: number;
    operation: 'create' | 'update' | 'delete';
    entityType: 'studyset' | 'user';
    entityId: string;
    payload: unknown;
    retryCount: number;
    createdAt: number;
}
```

## Migration from Existing Code

### Gradual Migration Strategy

1. **Phase 1**: Keep existing API hooks, add local storage as cache
2. **Phase 2**: Use hybrid hooks for new features
3. **Phase 3**: Replace API hooks with hybrid versions

### Example Migration

```tsx
// Before
import { useGetAllStudysets, useUpdateStudyset } from 'state/api/studysetsAPI';

// After (drop-in replacement)
import {
    useHybridGetAllStudysets,
    useHybridUpdateStudyset,
} from 'state/local/hooks';

// Usage is identical - both return same types
const { data } = useHybridGetAllStudysets();
const mutation = useHybridUpdateStudyset();
```

## File Storage Notes

File attachments use S3 signed URLs. In pure local mode:

- Files are stored as base64 in IndexedDB (not recommended for large files)
- Or use File System Access API (future enhancement)
- Or skip file storage entirely for pure offline mode

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 14.5+)

IndexedDB is used under the hood via Dexie.js.

## Development

### Reset Database

In DevTools console:

```js
import('state/local').then((m) => m.resetDatabase());
```

### View Database Contents

```js
import('state/local').then(async (m) => {
    const db = m.getDatabase();
    console.table(await db.studysets.toArray());
});
```
