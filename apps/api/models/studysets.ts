import type { StudysetBase, Timestamp } from "@quizaroni/shared-types";

export type {
    Card,
    CardFileMetadata,
    Note,
    StudysetMetadata,
    Timestamp,
    UUID,
} from "@quizaroni/shared-types";

/** The persisted DynamoDB record. The web client's `Studyset` differs: it
 * carries `uuid` instead of the PK/SK key pair. */
export type Studyset = StudysetBase & {
    PK: string;
    SK: string;
    updatedAt: Timestamp;
};
