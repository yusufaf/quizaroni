import {
    BASE_API_URL,
    fetchJson,
    getCommonPostRequestProps,
} from 'state/api/awsAPI';
import { validate } from 'shared/validation';
import {
    BaseResponseSchema,
    CreateStudysetResponseSchema,
    GetAllStudysetsResponseSchema,
    UpdateStudysetResponseSchema,
} from 'shared/schemas';
import type { Studyset, UUID } from 'shared/types';

/**
 * API client for syncing local changes to the backend.
 * These are direct API calls (not React Query hooks) for use by the SyncEngine.
 */

export const syncApiClient = {
    /**
     * Create a new studyset on the server
     */
    async createStudyset(studyset: Studyset): Promise<unknown> {
        const data = await fetchJson(
            `${BASE_API_URL}/studysets/create-studyset`,
            {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify({ studyset }),
            }
        );
        return validate({
            schema: CreateStudysetResponseSchema,
            data,
            type: 'response',
            context: 'SyncCreateStudyset',
        });
    },

    /**
     * Update an existing studyset on the server
     */
    async updateStudyset(
        studysetUUID: UUID,
        updates: Record<string, unknown>
    ): Promise<unknown> {
        const data = await fetchJson(
            `${BASE_API_URL}/studysets/update-studyset`,
            {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify({
                    studysetUUID,
                    updates,
                    isMetadataUpdate: false,
                }),
            }
        );
        return validate({
            schema: UpdateStudysetResponseSchema,
            data,
            type: 'response',
            context: 'SyncUpdateStudyset',
        });
    },

    /**
     * Delete a studyset from the server
     */
    async deleteStudyset(studysetUUID: UUID): Promise<unknown> {
        const data = await fetchJson(
            `${BASE_API_URL}/studysets/delete-studyset`,
            {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify({ studysetUUID }),
            }
        );
        return validate({
            schema: BaseResponseSchema,
            data,
            type: 'response',
            context: 'SyncDeleteStudyset',
        });
    },

    /**
     * Bulk update multiple studysets on the server
     */
    async bulkUpdateStudysets(
        updates: [UUID, Record<string, unknown>][]
    ): Promise<unknown> {
        const studysetUpdates = updates.map(([uuid, changes]) => ({
            studysetUUID: uuid,
            updates: changes,
        }));

        const data = await fetchJson(
            `${BASE_API_URL}/studysets/batch-update-studysets`,
            {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify({ studysetUpdates }),
            }
        );
        return validate({
            schema: BaseResponseSchema,
            data,
            type: 'response',
            context: 'SyncBatchUpdateStudysets',
        });
    },

    /**
     * Fetch all studysets from the server (for initial sync)
     */
    async getAllStudysets(): Promise<Studyset[]> {
        const data = await fetchJson(
            `${BASE_API_URL}/studysets/get-all-studysets`,
            {
                ...(await getCommonPostRequestProps()),
            }
        );
        const validated = validate({
            schema: GetAllStudysetsResponseSchema,
            data,
            type: 'response',
            context: 'SyncGetAllStudysets',
        });
        return (validated as { studysets: Studyset[] }).studysets ?? [];
    },

    /**
     * Update user metadata on the server
     */
    async updateUserMetadata(
        updates: Record<string, unknown>
    ): Promise<unknown> {
        const data = await fetchJson(`${BASE_API_URL}/users/update-metadata`, {
            ...(await getCommonPostRequestProps()),
            body: JSON.stringify({ updates }),
        });
        return validate({
            schema: BaseResponseSchema,
            data,
            type: 'response',
            context: 'SyncUpdateUserMetadata',
        });
    },
};
