export const PLURAL_CATEGORIES = [
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other',
] as const;

export type PluralCategory = (typeof PLURAL_CATEGORIES)[number];

/**
 * Splits an i18next v4 key into its base and plural category:
 * "review.dueCount_one" -> { base: "review.dueCount", category: "one" }
 * "review.title"        -> { base: "review.title", category: null }
 */
export function splitPluralKey(key: string): {
    base: string;
    category: PluralCategory | null;
} {
    const separator = key.lastIndexOf('_');
    const suffix = key.slice(separator + 1);
    return separator > 0 && isPluralCategory(suffix)
        ? { base: key.slice(0, separator), category: suffix }
        : { base: key, category: null };
}

const isPluralCategory = (value: string): value is PluralCategory =>
    (PLURAL_CATEGORIES as readonly string[]).includes(value);

/**
 * The plural categories a language actually selects for integer counts
 * 0–999. Intl's `pluralCategories` is too strict: es/fr/pt list `many`
 * (used only for 1,000,000 and up), which no translation here needs.
 */
export function requiredCategories(lng: string): Set<PluralCategory> {
    const rules = new Intl.PluralRules(lng);
    const reached = new Set<PluralCategory>();
    for (let n = 0; n < 1000; n++) {
        reached.add(rules.select(n));
    }
    return reached;
}
