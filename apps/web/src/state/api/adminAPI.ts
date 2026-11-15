import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { BASE_API_URL, fetchJson, getCommonPostRequestProps } from './awsAPI';
import { validate } from 'shared/validation';
import {
    CreateInviteResponseSchema,
    ListInvitesResponseSchema,
    OutboxResponseSchema,
    RevokeInviteResponseSchema,
} from 'shared/schemas';

// Self-host only: the instance admin's invites and mail outbox.

export type Invite = z.infer<
    typeof ListInvitesResponseSchema
>['invites'][number];
export type OutboxMessage = z.infer<
    typeof OutboxResponseSchema
>['messages'][number];
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;

export type CreateInviteInput = {
    email: string;
    days: number;
    maxUses: number;
};

const INVITES_KEY = ['admin', 'invites'];
const OUTBOX_KEY = ['admin', 'outbox'];

export const useInvites = () =>
    useQuery({
        queryKey: INVITES_KEY,
        queryFn: async () => {
            const data = await fetchJson(`${BASE_API_URL}/admin/invites`, {
                credentials: 'same-origin',
            });
            return validate({
                schema: ListInvitesResponseSchema,
                data,
                type: 'response',
                context: 'ListInvites',
                reThrow: true,
            }).invites;
        },
    });

export const useOutbox = () =>
    useQuery({
        queryKey: OUTBOX_KEY,
        queryFn: async () => {
            const data = await fetchJson(`${BASE_API_URL}/admin/outbox`, {
                credentials: 'same-origin',
            });
            return validate({
                schema: OutboxResponseSchema,
                data,
                type: 'response',
                context: 'Outbox',
                reThrow: true,
            });
        },
    });

const useInvalidateAdmin = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: INVITES_KEY });
        queryClient.invalidateQueries({ queryKey: OUTBOX_KEY });
    };
};

export const useCreateInvite = () => {
    const invalidate = useInvalidateAdmin();
    return useMutation({
        mutationFn: async ({ email, days, maxUses }: CreateInviteInput) => {
            const trimmed = email.trim();
            // A blank email means anyone; an emailed invite is single-use.
            const body = trimmed ? { email: trimmed, days } : { days, maxUses };
            const data = await fetchJson(`${BASE_API_URL}/admin/invites`, {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify(body),
            });
            return validate({
                schema: CreateInviteResponseSchema,
                data,
                type: 'response',
                context: 'CreateInvite',
                reThrow: true,
            });
        },
        onSuccess: invalidate,
    });
};

export const useRevokeInvite = () => {
    const invalidate = useInvalidateAdmin();
    return useMutation({
        mutationFn: async (id: string) => {
            const data = await fetchJson(
                `${BASE_API_URL}/admin/invites/${encodeURIComponent(id)}/revoke`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: '{}',
                }
            );
            return validate({
                schema: RevokeInviteResponseSchema,
                data,
                type: 'response',
                context: 'RevokeInvite',
                reThrow: true,
            });
        },
        onSuccess: invalidate,
    });
};
