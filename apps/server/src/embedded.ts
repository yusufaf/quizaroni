import type { Migration } from './db/migrations';

/** What the standalone binary's generated entry module embeds (see scripts/build-binary.ts). */
export type EmbeddedBundle = {
    /** URL path ('/index.html') to a path Bun.file can read inside the binary. */
    webFiles: ReadonlyMap<string, string>;
    migrations: readonly Migration[];
};

let bundle: EmbeddedBundle | undefined;

export function setEmbeddedBundle(value: EmbeddedBundle): void {
    bundle = value;
}

/** Set only when running as the standalone binary. */
export function embeddedBundle(): EmbeddedBundle | undefined {
    return bundle;
}
