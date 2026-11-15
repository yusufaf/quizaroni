import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { PAGE_TITLES } from 'shared/constants';
import { useSession } from 'shared/auth/session/SessionProvider';
import useBrowserTitle from 'hooks/useBrowserTitle';
import {
    type CreateInviteResponse,
    type OutboxMessage,
    useCreateInvite,
    useInvites,
    useOutbox,
    useRevokeInvite,
} from 'state/api/adminAPI';
import { useCopyLink } from './useCopyLink';

const EXPIRY_DAYS = [1, 7, 30] as const;
const USES_MAX = 100;

const formatDate = (iso: string) => new Date(iso).toLocaleString();

const CopyableLink = ({ link, label }: { link: string; label: string }) => {
    const { t } = useTranslation('admin');
    const copy = useCopyLink();
    const field = useRef<HTMLInputElement>(null);
    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
                inputRef={field}
                label={label}
                value={link}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
            />
            <Button
                variant="outlined"
                onClick={() => copy(link, field.current)}
                aria-label={t('copyLinkFor', { label })}
            >
                {t('copyLink')}
            </Button>
        </Stack>
    );
};

const InviteForm = () => {
    const { t } = useTranslation('admin');
    const create = useCreateInvite();
    const [email, setEmail] = useState('');
    const [days, setDays] = useState(7);
    const [maxUses, setMaxUses] = useState(1);
    const [created, setCreated] = useState<CreateInviteResponse | null>(null);
    const emailed = email.trim() !== '';

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        try {
            setCreated(await create.mutateAsync({ email, days, maxUses }));
            setEmail('');
        } catch {
            setCreated(null);
        }
    };

    return (
        <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2}>
                {create.isError && (
                    <Alert severity="error" role="alert">
                        {t('createFailed')}
                    </Alert>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        id="invite-email"
                        label={t('inviteEmail')}
                        helperText={t('inviteEmailHint')}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        id="invite-days"
                        select
                        label={t('expiresIn')}
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        sx={{ minWidth: 140 }}
                    >
                        {EXPIRY_DAYS.map((d) => (
                            <MenuItem key={d} value={d}>
                                {t('days', { count: d })}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        id="invite-max-uses"
                        label={t('maxUses')}
                        type="number"
                        value={emailed ? 1 : maxUses}
                        disabled={emailed}
                        onChange={(e) =>
                            setMaxUses(
                                Math.min(
                                    USES_MAX,
                                    Math.max(1, Math.trunc(Number(e.target.value)) || 1)
                                )
                            )
                        }
                        inputProps={{ min: 1, max: USES_MAX }}
                        sx={{ minWidth: 120 }}
                    />
                </Stack>
                <Box>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={create.isPending}
                    >
                        {t('createInvite')}
                    </Button>
                </Box>
                {created && (
                    <Alert severity="success" role="status">
                        <Stack spacing={1}>
                            <span>
                                {created.delivery
                                    ? t(`delivery.${created.delivery}`)
                                    : t('linkShownOnce')}
                            </span>
                            <CopyableLink
                                link={created.link}
                                label={t('inviteLink')}
                            />
                        </Stack>
                    </Alert>
                )}
            </Stack>
        </Box>
    );
};

const InvitesTable = () => {
    const { t } = useTranslation('admin');
    const invites = useInvites();
    const revoke = useRevokeInvite();

    if (invites.isPending) return <Typography>{t('loading')}</Typography>;
    if (invites.isError) {
        return (
            <Alert severity="error" role="alert">
                {t('loadFailed')}
            </Alert>
        );
    }
    if (invites.data.length === 0) {
        return <Typography>{t('noInvites')}</Typography>;
    }
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label={t('invitesTitle')}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t('inviteFor')}</TableCell>
                        <TableCell>{t('uses')}</TableCell>
                        <TableCell>{t('status')}</TableCell>
                        <TableCell>{t('expires')}</TableCell>
                        <TableCell align="right">{t('actions')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invites.data.map((invite) => (
                        <TableRow key={invite.id}>
                            <TableCell>{invite.email ?? t('anyone')}</TableCell>
                            <TableCell>
                                {invite.uses}/{invite.maxUses}
                            </TableCell>
                            <TableCell>
                                <Chip
                                    size="small"
                                    label={t(`statuses.${invite.status}`)}
                                    color={
                                        invite.status === 'active'
                                            ? 'success'
                                            : 'default'
                                    }
                                />
                            </TableCell>
                            <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                            <TableCell align="right">
                                {invite.status === 'active' && (
                                    <Button
                                        size="small"
                                        color="error"
                                        disabled={revoke.isPending}
                                        onClick={() => revoke.mutate(invite.id)}
                                        aria-label={t('revokeFor', {
                                            target: invite.email ?? t('anyone'),
                                        })}
                                    >
                                        {t('revoke')}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

const OutboxItem = ({ message }: { message: OutboxMessage }) => {
    const { t } = useTranslation('admin');
    return (
        <Paper variant="outlined" sx={{ p: 2 }} component="li">
            <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" component="h3">
                        {t(`kinds.${message.kind}`)} · {message.to}
                    </Typography>
                    {message.delivery === 'failed' && (
                        <Chip size="small" color="warning" label={t('deliveryFailed')} />
                    )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {t('createdExpires', {
                        created: formatDate(message.createdAt),
                        expires: formatDate(message.expiresAt),
                    })}
                </Typography>
                <CopyableLink link={message.link} label={t('link')} />
            </Stack>
        </Paper>
    );
};

const Outbox = () => {
    const { t } = useTranslation('admin');
    const outbox = useOutbox();

    if (outbox.isPending) return <Typography>{t('loading')}</Typography>;
    if (outbox.isError) {
        return (
            <Alert severity="error" role="alert">
                {t('loadFailed')}
            </Alert>
        );
    }
    return (
        <Stack spacing={2}>
            <Typography variant="body2">
                {outbox.data.smtp ? t('smtpOn') : t('smtpOff')}
            </Typography>
            {outbox.data.messages.length === 0 ? (
                <Typography>{t('outboxEmpty')}</Typography>
            ) : (
                <Stack component="ul" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                    {outbox.data.messages.map((message) => (
                        <OutboxItem key={message.id} message={message} />
                    ))}
                </Stack>
            )}
        </Stack>
    );
};

// Self-host only. The server also checks the admin role on every call.
const Admin = () => {
    const { t } = useTranslation('admin');
    useBrowserTitle(PAGE_TITLES.ADMIN);
    const { user } = useSession();

    if (user?.role !== 'admin') {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="info">{t('notAdmin')}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack spacing={4}>
                <Typography variant="h4" component="h1">
                    {t('title')}
                </Typography>
                <Stack spacing={2} component="section" aria-labelledby="admin-invites">
                    <Typography variant="h5" component="h2" id="admin-invites">
                        {t('invitesTitle')}
                    </Typography>
                    <Typography variant="body2">{t('invitesIntro')}</Typography>
                    <InviteForm />
                    <InvitesTable />
                </Stack>
                <Stack spacing={2} component="section" aria-labelledby="admin-outbox">
                    <Typography variant="h5" component="h2" id="admin-outbox">
                        {t('outboxTitle')}
                    </Typography>
                    <Outbox />
                </Stack>
            </Stack>
        </Container>
    );
};

export default Admin;
