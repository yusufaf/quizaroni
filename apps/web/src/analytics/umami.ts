import type { HtmlTagDescriptor, Plugin } from 'vite-plus';

/**
 * The Umami <script> tag for this build's env, or null when analytics is off.
 * The hosted image sets the VITE_UMAMI_* values in
 * .github/workflows/hosted-image.yml; the stock build leaves them unset, so
 * its index.html has no tag.
 */
export function umamiScriptTag(
    env: Record<string, string | undefined>
): HtmlTagDescriptor | null {
    const id = env.VITE_UMAMI_WEBSITE_ID || undefined;
    const src = env.VITE_UMAMI_SRC || undefined;
    const hostUrl = env.VITE_UMAMI_HOST_URL || undefined;
    if (!id && !src) return null;
    // Half-configured analytics would otherwise just silently record nothing.
    if (!id)
        throw new Error(
            'VITE_UMAMI_SRC is set but VITE_UMAMI_WEBSITE_ID is not'
        );
    if (!src)
        throw new Error(
            'VITE_UMAMI_WEBSITE_ID is set but VITE_UMAMI_SRC is not'
        );
    return {
        tag: 'script',
        injectTo: 'head',
        attrs: {
            defer: true,
            src,
            // Vite renders an undefined attr as "undefined", so leave it out.
            ...(hostUrl ? { 'data-host-url': hostUrl } : {}),
            'data-website-id': id,
        },
    };
}

/** Adds the Umami tag to index.html when this build's env configures it. */
export function umamiPlugin(): Plugin {
    let tag: HtmlTagDescriptor | null = null;
    return {
        name: 'quizaroni:umami',
        // Builds only: dev and vitest never load the tag, and a half-set env
        // can't break them.
        apply: 'build',
        configResolved(config) {
            tag = umamiScriptTag(config.env);
        },
        transformIndexHtml: () => (tag ? [tag] : []),
    };
}
