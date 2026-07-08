/**
 * Public-sharing access pattern.
 *
 * Public study sets are exposed to unauthenticated readers via the otherwise
 * unused `PK2` global secondary index. A set is indexed there *only while it is
 * public*, so the index always contains exactly the currently-public sets:
 *
 *   PK2 = "publicStudyset"            (constant partition — all public sets)
 *   SK2 = "studyset#<studysetUUID>"   (sort key — one row per set)
 *
 * This yields two access patterns from one key design:
 *   - fetch one public set by id:  Query PK2 = PUBLIC_STUDYSET_PK  AND SK2 = publicStudysetSK(id)
 *   - list every public set:       Query PK2 = PUBLIC_STUDYSET_PK
 *
 * Writers must add these attributes when `metadata.publiclyViewable` becomes
 * true and REMOVE them when it becomes false so the index self-maintains.
 */
export const PUBLIC_STUDYSET_PK = 'publicStudyset';

export const publicStudysetSK = (studysetUUID: string): string =>
    `studyset#${studysetUUID}`;

export const PUBLIC_GSI_INDEX_NAME = 'PK2';
