import type { Timestamp, UUID } from './primitives';
import type { SubjectId } from './subjects';
import type { TermPreview } from './termPreviews';

export type ExploreSort = 'newest';

// A text-only card for the Community feed (#135). Never carries file data.
export type ExploreSetSummary = {
    studysetUUID: UUID;
    title: string;
    description: string;
    subject: SubjectId;
    termCount: number;
    previews: TermPreview[];
    username: string | null;
    publishedAt: Timestamp;
    updatedAt: Timestamp | null;
};

// `total` is left out when the server's read hit its item cap. `featured` is
// set only on a featured=1 reply, so the web can tell it from the feed an
// older API sends when it ignores the param (#141).
export type ExploreFeedResponse = {
    items: ExploreSetSummary[];
    nextCursor: string | null;
    total?: number;
    featured?: true;
};
