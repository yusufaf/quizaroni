import { ContentCopyRounded } from '@mui/icons-material/';
import {
    Button,
    Dialog,
    DialogContent,
    Stack,
    TextField,
    Typography,
} from '@mui/material/';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { Studyset } from 'shared/types';

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
    // Omitted when publishing is unavailable, which hides the hint's button.
    onOpenPublish?: () => void;
};

const ShareDialog = ({ open, onClose, studyset, onOpenPublish }: Props) => {
    const { t } = useTranslation();
    const linkRef = useRef<HTMLInputElement>(null);

    const studysetUUID = studyset?.studysetUUID;
    const isPublished =
        !!studysetUUID && studyset?.metadata?.publiclyViewable === true;
    const url = `${window.location.origin}/view/${studysetUUID}`;

    // A missing navigator.clipboard (insecure origin) throws here too.
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t('dialogs.share.copied'), {
                position: toast.POSITION.BOTTOM_LEFT,
            });
        } catch {
            // The toast asks the user to copy by hand, so have the link ready.
            linkRef.current?.focus();
            linkRef.current?.select();
            toast.error(t('dialogs.share.copyFailed'), {
                position: toast.POSITION.BOTTOM_LEFT,
            });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <StandardDialogTitle
                title={t('dialogs.share.title')}
                onClose={onClose}
            />
            <DialogContent>
                {isPublished ? (
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{ pt: 1 }}
                    >
                        <TextField
                            id="share-link"
                            label={t('dialogs.share.linkLabel')}
                            value={url}
                            fullWidth
                            inputRef={linkRef}
                            InputProps={{ readOnly: true }}
                            onFocus={(event) => event.target.select()}
                        />
                        <Button
                            variant="contained"
                            startIcon={<ContentCopyRounded />}
                            onClick={handleCopy}
                            sx={{ flexShrink: 0 }}
                        >
                            {t('dialogs.share.copy')}
                        </Button>
                    </Stack>
                ) : (
                    <Stack spacing={2} alignItems="flex-start" sx={{ pt: 1 }}>
                        <Typography>
                            {t('dialogs.share.notPublished')}
                        </Typography>
                        {onOpenPublish && (
                            <Button variant="contained" onClick={onOpenPublish}>
                                {t('publish.menuPublish')}
                            </Button>
                        )}
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ShareDialog;
