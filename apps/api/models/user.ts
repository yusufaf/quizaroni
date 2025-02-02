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

export type UserMetadata = {
    defaultTheme: AppTheme;
    homeView: HomeView;
    namedColors: NamedColor[];
    visibleColumns: Record<string, boolean>;
    preferredDateFormat: string;
    defaultDownloadFormat: string;
};
