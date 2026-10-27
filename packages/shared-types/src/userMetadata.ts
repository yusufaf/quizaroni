// The metadata keys update-user-metadata accepts. The server-managed keys are
// written only by update-gamification and update-notification-preferences,
// which merge into the stored value instead of replacing it (#207).
export const CLIENT_EDITABLE_USER_METADATA_KEYS = [
    'aiModel',
    'aiProvider',
    'avatar',
    'confirmDestructiveActions',
    'defaultDownloadFormat',
    'defaultTheme',
    'density',
    'fontSizeScale',
    'hapticsEnabled',
    'homeView',
    'namedColors',
    'preferredDateFormat',
    'preferredTimeFormat',
    'showSeconds',
    'ttsVoice',
    'visibleColumns',
] as const;

export type ClientEditableUserMetadataKey = (typeof CLIENT_EDITABLE_USER_METADATA_KEYS)[number];

export const SERVER_MANAGED_USER_METADATA_KEYS = [
    'customAchievements',
    'gamification',
    'notifications',
] as const;

export const isClientEditableUserMetadataKey = (key: string): key is ClientEditableUserMetadataKey =>
    (CLIENT_EDITABLE_USER_METADATA_KEYS as readonly string[]).includes(key);

export const pickClientEditableUserMetadata = (
    metadata: Record<string, unknown>
): Partial<Record<ClientEditableUserMetadataKey, unknown>> =>
    Object.fromEntries(Object.entries(metadata).filter(([key]) => isClientEditableUserMetadataKey(key)));
