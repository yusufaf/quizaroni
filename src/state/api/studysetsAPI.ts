import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { BASE_API_URL, getCommonPostRequestProps } from './awsAPI';
import { validate } from 'shared/validation';
import {
    BaseResponseSchema,
    GetAllStudysetsResponseSchema,
    GetStudysetResponseSchema,
    CreateStudysetResponseSchema,
    UpdateStudysetResponseSchema,
    BatchDeleteStudysetsResponseSchema,
    BatchDuplicateStudysetsResponseSchema,
    CreateNoteResponseSchema,
} from 'shared/schemas';

/* Endpoints
    Studyset Operations
    router.post("/api/studysets/get-all-studysets", getAllStudysets);
    router.post("/api/studysets/get-studyset", getStudyset);
    router.post("/api/studysets/create-studyset", createStudyset);
    router.post("/api/studysets/delete-studyset", deleteStudyset);
    router.post("/api/studysets/batch-delete-studysets", batchDeleteStudysets);
    router.post("/api/studysets/duplicate-studyset", duplicateStudyset);
    router.post("/api/studysets/batch-duplicate-studysets", batchDuplicateStudysets);
    router.post("/api/studysets/update-studyset", updateStudyset);
    router.post("/api/studysets/batch-update-studysets", batchUpdateStudysets);
    router.post("/api/studysets/editCategory", editCategory);
    
    Note Operations
    router.post("/api/studysets/create-note", createNote);
    router.post("/api/studysets/delete-note", deleteNote);
    router.post("/api/studysets/edit-note", editNote);
    
    Label Operations
    router.post("/api/studysets/create-labels", createLabels);
    router.post("/api/studysets/delete-labels", deleteLabels);
    router.post("/api/studysets/edit-labels", editLabels);
    router.post("/api/studysets/update-studyset-labels", updateStudysetLabels);
*/

import {
    UUID,
    Studyset,
    EditCategoryRequest,
    DeleteStudysetRequest,
    GetAllStudysetsRequest,
    GetStudysetRequest,
    DuplicateStudysetRequest,
    CreateLabelRequest,
    DeleteLabelRequest,
    EditLabelRequest,
    ChangeLabelRequest,
    CreateNoteRequest,
    DeleteNoteRequest,
    EditNoteRequest,
    UpdateStudysetRequest,
    GetAllStudysetsResponse,
    GetStudysetResponse,
    CreateStudysetResponse,
    BatchUpdateStudysetsRequest,
    CreateNoteResponse,
    UpdateStudysetResponse,
    BatchDeleteStudysetsResponse,
    BatchDuplicateStudysetsResponse,
    BatchDeleteStudysetsRequest,
    BatchDuplicateStudysetsRequest,
} from 'shared/types';

// Queries
export const useGetAllStudysets = (options?: Omit<UseQueryOptions<GetAllStudysetsResponse>, 'queryKey' | 'queryFn'>) => {
    return useQuery({
        queryKey: ['studysets'],
        queryFn: async () => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/get-all-studysets`,
                {
                    ...getCommonPostRequestProps(),
                }
            );
            const data = await response.json();
            return validate({
                schema: GetAllStudysetsResponseSchema,
                data,
                type: 'response',
                context: 'GetAllStudysets'
            });
        },
        ...options,
    });
};

export const useGetStudyset = ({ studysetUUID }: GetStudysetRequest, options?: Omit<UseQueryOptions<GetStudysetResponse>, 'queryKey' | 'queryFn'>) => {
    return useQuery({
        queryKey: ['studysets', studysetUUID],
        queryFn: async () => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/get-studyset`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({ studysetUUID }),
                }
            );
            const data = await response.json();
            return validate({
                schema: GetStudysetResponseSchema,
                data,
                type: 'response',
                context: 'GetStudyset'
            });
        },
        ...options,
    });
};

// Mutations
export const useCreateStudyset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/create-studyset`,
                {
                    ...getCommonPostRequestProps(),
                }
            );
            const data = await response.json();
            return validate({
                schema: CreateStudysetResponseSchema,
                data,
                type: 'response',
                context: 'CreateStudyset'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
        },
    });
};

export const useDeleteStudyset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUUID }: DeleteStudysetRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/delete-studyset`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DeleteStudyset'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
        },
    });
};

export const useBatchDeleteStudysets = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUUIDs }: BatchDeleteStudysetsRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/batch-delete-studysets`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({ studysetUUIDs }),
                }
            );
            const data = await response.json();
            return validate({
                schema: BatchDeleteStudysetsResponseSchema,
                data,
                type: 'response',
                context: 'BatchDeleteStudysets'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
        },
    });
};

export const useDuplicateStudyset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUUID }: DuplicateStudysetRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/duplicate-studyset`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DuplicateStudyset'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
        },
    });
};

export const useBatchDuplicateStudysets = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            studysetUUIDs,
        }: BatchDuplicateStudysetsRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/batch-duplicate-studysets`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({ studysetUUIDs }),
                }
            );
            const data = await response.json();
            return validate({
                schema: BatchDuplicateStudysetsResponseSchema,
                data,
                type: 'response',
                context: 'BatchDuplicateStudysets'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
        },
    });
};

export const useUpdateStudyset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            studysetUUID,
            updates,
            isMetadataUpdate,
        }: UpdateStudysetRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/update-studyset`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({
                        studysetUUID,
                        updates,
                        isMetadataUpdate,
                    }),
                }
            );
            const data = await response.json();
            return validate({
                schema: UpdateStudysetResponseSchema,
                data,
                type: 'response',
                context: 'UpdateStudyset'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useBatchUpdateStudysets = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            studysetUpdates,
        }: BatchUpdateStudysetsRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/batch-update-studysets`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUpdates }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'BatchUpdateStudysets'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
        },
    });
};

export const useEditCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            studysetUUID,
            index,
            newCategory,
            oldCategory,
        }: EditCategoryRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/editCategory`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({
                    studysetUUID,
                    index,
                    newCategory,
                    oldCategory,
                }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'EditCategory'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useCreateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ cardUUID, studysetUUID }: CreateNoteRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/create-note`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({ cardUUID, studysetUUID }),
                }
            );
            const data = await response.json();
            return validate({
                schema: CreateNoteResponseSchema,
                data,
                type: 'response',
                context: 'CreateNote'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useDeleteNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            cardUUID,
            noteUUID,
            studysetUUID,
        }: DeleteNoteRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/delete-note`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ cardUUID, noteUUID, studysetUUID }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DeleteNote'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useEditNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            cardUUID,
            noteUUID,
            studysetUUID,
            text,
        }: EditNoteRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/edit-note`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({
                    cardUUID,
                    noteUUID,
                    studysetUUID,
                    text,
                }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'EditNote'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useCreateLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            label,
            studysetUUID,
            updateStudysetLabel,
        }: CreateLabelRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/create-labels`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({
                    label,
                    studysetUUID,
                    updateStudysetLabel,
                }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'CreateLabel'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useDeleteLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ labelsToDelete }: DeleteLabelRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/delete-labels`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ labelsToDelete }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DeleteLabel'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useEditLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ index, newLabel, oldLabel }: EditLabelRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/edit-labels`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ index, newLabel, oldLabel }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'EditLabel'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

// Deprecated - use useUpdateStudysetLabels instead
export const useChangeLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUUID, newLabel }: ChangeLabelRequest) => {
            // Convert single label to array for backwards compatibility
            const response = await fetch(`${BASE_API_URL}/studysets/update-studyset-labels`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID, labels: [newLabel] }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'ChangeLabel'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useUpdateStudysetLabels = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUUID, labels }: import('shared/types').UpdateStudysetLabelsRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/update-studyset-labels`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID, labels }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateStudysetLabels'
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};

export const useBatchUpdateStudysetLabels = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUpdates }: import('shared/types').BatchUpdateStudysetLabelsRequest) => {
            const response = await fetch(`${BASE_API_URL}/studysets/batch-update-studyset-labels`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUpdates }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'BatchUpdateStudysetLabels'
            });
        },
        onSuccess: () => {
            // Invalidate all studysets queries to refresh data
            queryClient.invalidateQueries({
                queryKey: ['studysets'],
            });
        },
    });
};
