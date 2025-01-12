import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { TODO } from 'shared/types';

type UseCustomMutationProps = {
    mutation: TODO;
    successMessage: string;
    errorMessage: string;
    onSuccess?: () => void;
    onError?: () => void;
};

export default function useCustomMutation(props: UseCustomMutationProps) {
    const {
        mutation,
        successMessage = 'Success!',
        errorMessage = 'Error!',
        onSuccess,
        onError,
    } = props;

    const [mutate, { isLoading, isSuccess, isError }] = mutation();

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
    }, [isSuccess, isError, successMessage, errorMessage]);

    return {
        mutate,
        isLoading,
        isSuccess,
        isError,
    };
}
