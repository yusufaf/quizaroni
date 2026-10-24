import { useRef, useState } from 'react';
import { BookmarkAdded, BookmarkAddOutlined } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import { useLogto } from '@logto/react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isHttpStatus } from 'state/api/awsAPI';
import { useCopyPublicStudyset } from 'state/api/studysetsAPI';
import { TileAction } from 'views/Explore/ExploreStyles';

type Props = {
    studysetUUID: string;
    title: string;
    variant: 'text' | 'icon';
};

/**
 * Saves someone else's public set into the viewer's library (#140). A
 * logged-out visitor is sent to login and back to the set; there's no
 * automatic save after login. Never `disabled`, so keyboard focus stays put
 * while a save is pending or done.
 */
const SavePublicSetButton = ({ studysetUUID, title, variant }: Props) => {
    const { t } = useTranslation();
    const { isAuthenticated } = useLogto();
    const { mutateAsync, isPending } = useCopyPublicStudyset();
    const [saved, setSaved] = useState(false);
    // isPending only flips after a render, so a fast double click would
    // otherwise send two saves.
    const inFlight = useRef(false);

    if (!isAuthenticated) {
        const loginProps = {
            component: RouterLink,
            to: '/login',
            state: { from: `/view/${studysetUUID}` },
        };
        return variant === 'icon' ? (
            <Tooltip title={t('save.action')}>
                <TileAction
                    size="small"
                    {...loginProps}
                    aria-label={t('save.cardLabel', { title })}
                >
                    <BookmarkAddOutlined fontSize="small" />
                </TileAction>
            </Tooltip>
        ) : (
            <Button
                variant="contained"
                size="small"
                startIcon={<BookmarkAddOutlined />}
                {...loginProps}
            >
                {t('save.action')}
            </Button>
        );
    }

    const save = () => {
        if (inFlight.current || saved) return;
        inFlight.current = true;
        // The promise, unlike per-call mutate() callbacks, settles even if the
        // button unmounts first, so the user still hears how the save went.
        mutateAsync({ studysetUUID })
            .then(
                () => {
                    setSaved(true);
                    toast.success(t('save.success'), {
                        position: toast.POSITION.BOTTOM_LEFT,
                    });
                },
                (error: unknown) => {
                    toast.error(
                        t(
                            isHttpStatus(error, 404)
                                ? 'save.unavailable'
                                : 'save.error'
                        ),
                        { position: toast.POSITION.BOTTOM_LEFT }
                    );
                }
            )
            .catch((error: unknown) => console.error(error))
            .finally(() => {
                inFlight.current = false;
            });
    };

    const busy = isPending || saved;
    const icon = saved ? <BookmarkAdded /> : <BookmarkAddOutlined />;

    if (variant === 'icon') {
        return (
            <Tooltip title={t(saved ? 'save.saved' : 'save.action')}>
                <TileAction
                    size="small"
                    onClick={save}
                    aria-disabled={busy || undefined}
                    aria-label={t(
                        saved ? 'save.savedCardLabel' : 'save.cardLabel',
                        {
                            title,
                        }
                    )}
                >
                    {saved ? (
                        <BookmarkAdded fontSize="small" />
                    ) : (
                        <BookmarkAddOutlined fontSize="small" />
                    )}
                </TileAction>
            </Tooltip>
        );
    }

    return (
        <Button
            variant="contained"
            size="small"
            startIcon={icon}
            onClick={save}
            aria-disabled={busy || undefined}
        >
            {t(
                saved ? 'save.saved' : isPending ? 'save.saving' : 'save.action'
            )}
        </Button>
    );
};

export default SavePublicSetButton;
