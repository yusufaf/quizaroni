import { useEffect, useRef } from "react";
import { getSyncEngine, type SyncOptions } from "../sync/SyncEngine";
import { registerServiceWorker } from "../pwa/registerSW";
import { syncApiClient } from "../api/syncApiClient";
import { useGamificationStore } from "state/stores/gamification";

// API client wrapper for the sync engine
const defaultApiClient: SyncOptions["apiClient"] = {
  updateStudyset: syncApiClient.updateStudyset,
  createStudyset: syncApiClient.createStudyset,
  deleteStudyset: syncApiClient.deleteStudyset,
  updateUserMetadata: syncApiClient.updateUserMetadata,
  bulkUpdateStudysets: syncApiClient.bulkUpdateStudysets,
};

interface GlobalSyncInitializerProps {
  // If true, enable backend sync (requires API configuration)
  enableSync?: boolean;
  // Custom API client (optional - falls back to default)
  apiClient?: SyncOptions["apiClient"];
}

/**
 * Initialize global sync engine and PWA service worker.
 * Place this near the root of your app (inside providers).
 */
export function GlobalSyncInitializer({
  enableSync = false, // Default to local-only mode
  apiClient,
}: GlobalSyncInitializerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Register PWA service worker
    registerServiceWorker();

    // Load gamification state from Dexie
    void useGamificationStore.getState().hydrateFromDb();

    // Initialize sync engine
    const syncEngine = getSyncEngine({
      apiClient: enableSync ? apiClient || defaultApiClient : null,
      enabled: enableSync,
      pollInterval: 30000,
    });

    // Start sync polling
    syncEngine.start();

    // Cleanup on unmount
    return () => {
      syncEngine.stop();
    };
  }, [enableSync, apiClient]);

  // This component doesn't render anything
  return null;
}
