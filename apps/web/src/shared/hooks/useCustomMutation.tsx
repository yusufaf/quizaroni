import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { UseMutationResult } from '@tanstack/react-query';

type UseCustomMutationProps<
    TData = unknown,
    TError = unknown,
    TVariables = void,
    TContext = unknown,
> = {
    mutation: () => UseMutationResult<TData, TError, TVariables, TContext>;
    successMessage: string;
    errorMessage: string;
    onSuccess?: () => void;
    onError?: () => void;
};

export default function useCustomMutation<
    TData = unknown,
    TError = unknown,
    TVariables = void,
    TContext = unknown,
>(props: UseCustomMutationProps<TData, TError, TVariables, TContext>) {
    const {
        mutation,
        successMessage = 'Success!',
        errorMessage = 'Error!',
        onSuccess,
        onError,
    } = props;

    const { mutate, isPending, isSuccess, isError } = mutation();

    const prevSuccessRef = useRef(false);
    const prevErrorRef = useRef(false);

    useEffect(() => {
        if (isSuccess && !prevSuccessRef.current) {
            onSuccess?.();
            toast.success(successMessage, {
                position: toast.POSITION.BOTTOM_LEFT,
            });
            prevSuccessRef.current = true;
        } else if (!isSuccess) {
            prevSuccessRef.current = false;
        }

        if (isError && !prevErrorRef.current) {
            onError?.();
            toast.error(errorMessage, {
                position: toast.POSITION.BOTTOM_LEFT,
            });
            prevErrorRef.current = true;
        } else if (!isError) {
            prevErrorRef.current = false;
        }
    }, [isSuccess, isError, successMessage, errorMessage]);

    return {
        mutate,
        isLoading: isPending,
        isSuccess,
        isError,
    };
}
