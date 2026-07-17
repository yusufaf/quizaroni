import { getDatabase } from 'state/local/db';
import { AIMessage } from './providers';

/**
 * Persists one AI conversation per study set in IndexedDB (Dexie) so chats
 * survive a page refresh. Keyed by studysetUUID.
 */

export const loadConversation = async (
    studysetUUID: string
): Promise<AIMessage[]> => {
    try {
        const db = getDatabase();
        const record = await db.aiChatHistory.get(studysetUUID);
        return record?.messages ?? [];
    } catch (err) {
        console.error('Failed to load AI conversation:', err);
        return [];
    }
};

export const saveConversation = async (
    studysetUUID: string,
    messages: AIMessage[]
): Promise<void> => {
    try {
        const db = getDatabase();
        await db.aiChatHistory.put({
            studysetUUID,
            messages,
            updatedAt: Date.now(),
        });
    } catch (err) {
        console.error('Failed to save AI conversation:', err);
    }
};

export const clearConversation = async (
    studysetUUID: string
): Promise<void> => {
    try {
        const db = getDatabase();
        await db.aiChatHistory.delete(studysetUUID);
    } catch (err) {
        console.error('Failed to clear AI conversation:', err);
    }
};
