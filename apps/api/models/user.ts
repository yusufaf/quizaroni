export type UUID = string;
export type Timestamp = string;

export type User = {
    createdAt: Timestamp;
    email: string;
    emailVerified: boolean;
    labels: string[];
    metadata: UserMetadata;
    updatedAt: Timestamp;
    username: string;
    userUUID: UUID;
};

export type AppTheme = 'light' | 'dark';
export type HomeView = 'table' | 'grid' | 'html';
export type NamedColor = { color: string; name: string };

export type AvatarMetadata = {
    type: 'dicebear' | 'upload';
    value: string;
};

// Notification Types
export type NotificationMode = 'calm' | 'regular' | 'power-user' | 'custom';

export type EmailNotificationSettings = {
    enabled: boolean;
    studyReminders: boolean;
    streakAlerts: boolean;
    weeklyDigest: boolean;
    inactivityNudges: boolean;
    digestDay?: number; // 0-6 (Sunday-Saturday)
};

export type QuietHoursSettings = {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
};

export type StudysetNotificationPrefs = {
    studysetUUID: UUID;
    enabled: boolean;
    reminderTime?: string; // HH:mm
    reminderDays?: number[]; // 0-6 (Sunday-Saturday)
};

export type NotificationPreferences = {
    enabled: boolean;
    mode: NotificationMode;
    email: EmailNotificationSettings;
    quietHours: QuietHoursSettings;
    snoozeUntil?: Timestamp;
    studysetPrefs: StudysetNotificationPrefs[];
};

export type UserMetadata = {
    avatar?: AvatarMetadata;
    defaultTheme: AppTheme;
    homeView: HomeView;
    namedColors: NamedColor[];
    notifications?: NotificationPreferences;
    visibleColumns: Record<string, boolean>;
    preferredDateFormat: string;
    preferredTimeFormat?: string;
    showSeconds?: boolean;
    defaultDownloadFormat: string;
};
