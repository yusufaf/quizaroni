import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { UseMutationResult } from '@tanstack/react-query';

type UseCustomMutationProps<TData = unknown, TError = unknown, TVariables = void, TContext = unknown> = {
    mutation: () => UseMutationResult<TData, TError, TVariables, TContext>;
    successMessage: string;
    errorMessage: string;
    onSuccess?: () => void;
    onError?: () => void;
};

export default function useCustomMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(
    props: UseCustomMutationProps<TData, TError, TVariables, TContext>
) {
    const {
        mutation,
        successMessage = 'Success!',
        errorMessage = 'Error!',
        onSuccess,
        onError,
    } = props;

    const { mutate, isPending, isSuccess, isError } = mutation();

    useEffect(() => {
        if (isSuccess) {
            onSuccess?.();
            toast.success(successMessage, {
                position: toast.POSITION.BOTTOM_LEFT,
            });
        }
        if (isError) {
            onError?.();
            toast.error(errorMessage, {
                position: toast.POSITION.BOTTOM_LEFT,
            });
        }
    }, [isSuccess, isError, successMessage, errorMessage, onSuccess, onError]);

    return {
        mutate,
        isLoading: isPending,
        isSuccess,
        isError,
    };
}
