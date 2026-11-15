import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

// select() leaves read-only inputs unselected on iOS Safari.
const selectAll = (input: HTMLInputElement) =>
    input.setSelectionRange(0, input.value.length);

// navigator.clipboard is missing on plain-HTTP origins (a LAN server with
// QZ_INSECURE_COOKIES), so a failed copy selects the link for copying by hand.
export const useCopyLink = () => {
    const { t } = useTranslation('admin');
    return useCallback(
        async (link: string, field: HTMLInputElement | null) => {
            try {
                await navigator.clipboard.writeText(link);
                toast.success(t('copied'), {
                    position: toast.POSITION.BOTTOM_LEFT,
                });
            } catch {
                if (field) {
                    field.focus();
                    selectAll(field);
                }
                toast.error(t('copyManually'), {
                    position: toast.POSITION.BOTTOM_LEFT,
                });
            }
        },
        [t]
    );
};
