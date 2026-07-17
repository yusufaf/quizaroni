import { SuggestedCard } from './providers';

/**
 * Tolerant parser for the strict-JSON card list returned by the AI in
 * `suggestCards` mode. Strips markdown code fences and extracts the first
 * JSON object/array found. Returns [] when nothing parseable is present.
 */
export const parseSuggestedCards = (content: string): SuggestedCard[] => {
    if (!content) return [];

    // Strip ```json ... ``` or ``` ... ``` fences
    let text = content.trim();
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
        text = fenceMatch[1].trim();
    }

    const tryParse = (raw: string): unknown => {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };

    let parsed = tryParse(text);

    // Fallback: grab the first {...} or [...] block in the text
    if (!parsed) {
        const objMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (objMatch) {
            parsed = tryParse(objMatch[0]);
        }
    }

    if (!parsed) return [];

    const rawCards = Array.isArray(parsed)
        ? parsed
        : (parsed as { cards?: unknown }).cards;

    if (!Array.isArray(rawCards)) return [];

    return rawCards
        .map((c) => ({
            term: typeof c?.term === 'string' ? c.term.trim() : '',
            definition:
                typeof c?.definition === 'string' ? c.definition.trim() : '',
        }))
        .filter((c) => c.term && c.definition);
};
