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
 * PK2/SK2 are written only by the `publish-studyset` / `unpublish-studyset`
 * lambdas and the `scripts/unpublishStudyset.ts` takedown (plus the legacy
 * one-off `scripts/backfillPublicGsi.ts`); `update-studyset` strips them.
 * Readers still apply `isPubliclyListed` as defence in depth.
 */
export const PUBLIC_STUDYSET_PK = 'publicStudyset';

export const publicStudysetSK = (studysetUUID: string): string =>
    `studyset#${studysetUUID}`;

export const PUBLIC_GSI_INDEX_NAME = 'PK2';

type PublicIndexItem = {
    metadata?: { publiclyViewable?: unknown };
    moderation?: { hiddenAt?: unknown };
};

export const isHidden = (item: PublicIndexItem | undefined): boolean =>
    !!item?.moderation?.hiddenAt;

// The one rule both public read paths apply, so the sitemap never lists a URL
// the set endpoint would 404.
export const isPubliclyListed = (item: PublicIndexItem | undefined): boolean =>
    item?.metadata?.publiclyViewable === true && !isHidden(item);
