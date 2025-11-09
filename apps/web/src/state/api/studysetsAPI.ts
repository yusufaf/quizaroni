import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BASE_API_URL, getCommonPostRequestProps } from './awsAPI';

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
    router.post("/api/studysets/create-label", createLabel);
    router.post("/api/studysets/delete-label", deleteLabel);
    router.post("/api/studysets/edit-label", editLabel);
    router.post("/api/studysets/change-label", changeLabel);
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
export const useGetAllStudysets = () => {
    return useQuery({
        queryKey: ['studysets'],
        queryFn: async () => {
            const response = await fetch(
                `${BASE_API_URL}/studysets/get-all-studysets`,
                {
                    ...getCommonPostRequestProps(),
                }
            );
            return response.json() as Promise<GetAllStudysetsResponse>;
        },
    });
};

export const useGetStudyset = ({ studysetUUID }: GetStudysetRequest) => {
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
            return response.json() as Promise<GetStudysetResponse>;
        },
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
            return response.json() as Promise<CreateStudysetResponse>;
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
            await fetch(`${BASE_API_URL}/studysets/delete-studyset`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID }),
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
            return response.json() as Promise<BatchDeleteStudysetsResponse>;
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
            await fetch(`${BASE_API_URL}/studysets/duplicate-studyset`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID }),
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
            return response.json() as Promise<BatchDuplicateStudysetsResponse>;
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
            return response.json() as Promise<UpdateStudysetResponse>;
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
            await fetch(`${BASE_API_URL}/studysets/batch-update-studysets`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUpdates }),
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
            const response = await fetch('studysets/editCategory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studysetUUID,
                    index,
                    newCategory,
                    oldCategory,
                }),
            });
            return response.json() as Promise<Studyset>;
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
            return response.json() as Promise<CreateNoteResponse>;
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
            await fetch(`${BASE_API_URL}/studysets/delete-note`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ cardUUID, noteUUID, studysetUUID }),
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
            await fetch(`${BASE_API_URL}/studysets/edit-note`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({
                    cardUUID,
                    noteUUID,
                    studysetUUID,
                    text,
                }),
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
            await fetch(`${BASE_API_URL}/studysets/create-label`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({
                    label,
                    studysetUUID,
                    updateStudysetLabel,
                }),
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
            await fetch(`${BASE_API_URL}/studysets/delete-label`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ labelsToDelete }),
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
            await fetch(`${BASE_API_URL}/studysets/edit-label`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ index, newLabel, oldLabel }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studysets'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useChangeLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studysetUUID, newLabel }: ChangeLabelRequest) => {
            await fetch(`${BASE_API_URL}/studysets/change-label`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ studysetUUID, newLabel }),
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', variables.studysetUUID],
            });
        },
    });
};
