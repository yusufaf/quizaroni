import {
    MAX_OPEN_UPLOADS_PER_USER,
    newCardFileKey,
    UPLOAD_TTL_MS,
} from './keys';
import type { FileStore } from './store';

export type UploadSession = {
    uploadId: string;
    ownerId: string;
    key: string;
    studysetUUID: string;
    numParts?: number;
    parts: Map<number, { etag: string; size: number }>;
    // Bytes received so far by part PUTs still streaming.
    inflight: Map<number, number>;
    completing: boolean;
    failed: boolean;
    createdAt: number;
};

// Uploads in progress, kept in memory: a restart wipes the staging dir, so
// an interrupted upload simply has to start again.
export class UploadRegistry {
    private sessions = new Map<string, UploadSession>();

    constructor(
        private readonly files: FileStore,
        private readonly now: () => number = () => Date.now()
    ) {}

    start(ownerId: string, studysetUUID: string): UploadSession | 'too_many' {
        this.sweep();
        let open = 0;
        for (const s of this.sessions.values()) {
            if (s.ownerId === ownerId && !s.failed) open++;
        }
        if (open >= MAX_OPEN_UPLOADS_PER_USER) return 'too_many';
        const session: UploadSession = {
            uploadId: crypto.randomUUID(),
            ownerId,
            key: newCardFileKey(studysetUUID),
            studysetUUID,
            parts: new Map(),
            inflight: new Map(),
            completing: false,
            failed: false,
            createdAt: this.now(),
        };
        this.files.openStaging(session.uploadId);
        this.sessions.set(session.uploadId, session);
        return session;
    }

    get(uploadId: unknown, ownerId: string): UploadSession | undefined {
        if (typeof uploadId !== 'string') return undefined;
        const session = this.sessions.get(uploadId);
        if (
            !session ||
            session.ownerId !== ownerId ||
            session.failed ||
            this.expired(session)
        ) {
            return undefined;
        }
        return session;
    }

    // An upload that can never complete stops holding its slot at once. Its
    // staging dir goes when no part is still streaming into it.
    fail(session: UploadSession): void {
        session.failed = true;
        this.sweep();
    }

    reservedBytes(session: UploadSession, exceptPart: number): number {
        let total = 0;
        for (const [n, part] of session.parts) {
            if (n !== exceptPart) total += part.size;
        }
        for (const [n, bytes] of session.inflight) {
            if (n !== exceptPart) total += bytes;
        }
        return total;
    }

    finish(uploadId: string): void {
        this.sessions.delete(uploadId);
        this.files.removeStaging(uploadId);
    }

    sweep(): void {
        for (const session of [...this.sessions.values()]) {
            if (session.inflight.size > 0 || session.completing) continue;
            if (session.failed || this.expired(session)) {
                this.finish(session.uploadId);
            }
        }
    }

    private expired(session: UploadSession): boolean {
        return this.now() - session.createdAt > UPLOAD_TTL_MS;
    }
}
