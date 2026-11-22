import { describe, expect, it } from 'vite-plus/test';
import { LANGUAGE_OPTIONS, NAMESPACES } from './languages';
import {
    type PluralCategory,
    requiredCategories,
    splitPluralKey,
} from './plurals';

type Strings = Record<string, string>;
type Family = Map<PluralCategory | null, string>;

const files = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
    eager: true,
    import: 'default',
});

const flatten = (obj: Record<string, unknown>, prefix = ''): Strings =>
    Object.entries(obj).reduce<Strings>((acc, [key, value]) => {
        if (value !== null && typeof value === 'object') {
            Object.assign(
                acc,
                flatten(value as Record<string, unknown>, `${prefix}${key}.`)
            );
        } else {
            acc[`${prefix}${key}`] = String(value);
        }
        return acc;
    }, {});

const locales: Record<string, Record<string, Strings>> = {};
for (const [file, json] of Object.entries(files)) {
    const [, lng, ns] = file.match(/locales\/([^/]+)\/([^/]+)\.json$/)!;
    (locales[lng!] ??= {})[ns!] = flatten(json);
}

const familiesOf = (strings: Strings): Map<string, Family> => {
    const families = new Map<string, Family>();
    for (const [key, value] of Object.entries(strings)) {
        const { base, category } = splitPluralKey(key);
        if (!families.has(base)) families.set(base, new Map());
        families.get(base)!.set(category, value);
    }
    return families;
};

const isPlural = (family: Family) => !family.has(null);

const placeholders = (values: Iterable<string>, { skipCount = false } = {}) => {
    const names = new Set<string>();
    for (const value of values) {
        for (const [, name] of value.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)) {
            if (!(skipCount && name === 'count')) names.add(name!);
        }
    }
    return [...names].sort();
};

const codes = LANGUAGE_OPTIONS.map(({ code }) => code);
const targets = codes.filter((code) => code !== 'en');

describe('locale files', () => {
    it('has a folder for every supported language and nothing else', () => {
        expect(Object.keys(locales).sort()).toEqual([...codes].sort());
    });

    it.each(codes)('%s has every namespace', (lng) => {
        expect(Object.keys(locales[lng] ?? {}).sort()).toEqual(
            [...NAMESPACES].sort()
        );
    });

    describe.each(codes)('%s', (lng) => {
        const required = requiredCategories(lng);

        it.each([...NAMESPACES])(
            '%s: plural keys cover the required categories',
            (ns) => {
                const incomplete = [...familiesOf(locales[lng]![ns]!)]
                    .filter(([, family]) => isPlural(family))
                    .filter(([, family]) =>
                        [...required].some((c) => !family.has(c))
                    )
                    .map(([base]) => base);
                expect(incomplete).toEqual([]);
            }
        );

        it.each([...NAMESPACES])('%s: has no empty strings', (ns) => {
            const empty = Object.entries(locales[lng]![ns]!)
                .filter(([, value]) => value.trim() === '')
                .map(([key]) => key);
            expect(empty).toEqual([]);
        });
    });

    describe.each(targets)('%s matches en', (lng) => {
        it.each([...NAMESPACES])('%s: same keys', (ns) => {
            const en = familiesOf(locales.en![ns]!);
            const target = familiesOf(locales[lng]![ns]!);
            expect({
                missing: [...en.keys()].filter((base) => !target.has(base)),
                extra: [...target.keys()].filter((base) => !en.has(base)),
                pluralMismatch: [...en.keys()].filter(
                    (base) =>
                        target.has(base) &&
                        isPlural(en.get(base)!) !== isPlural(target.get(base)!)
                ),
            }).toEqual({ missing: [], extra: [], pluralMismatch: [] });
        });

        it.each([...NAMESPACES])('%s: same placeholders', (ns) => {
            const en = familiesOf(locales.en![ns]!);
            const target = familiesOf(locales[lng]![ns]!);
            const mismatched = [...en].flatMap(([base, enFamily]) => {
                const family = target.get(base);
                if (!family) return [];
                if (!isPlural(enFamily)) {
                    return placeholders([enFamily.get(null)!]).join() ===
                        placeholders([family.get(null)!]).join()
                        ? []
                        : [base];
                }
                // en "One card" may omit {{count}} where ru "_one" (21, 31…) needs
                // it, so count only has to appear somewhere in the family.
                const sameOthers =
                    placeholders(enFamily.values(), {
                        skipCount: true,
                    }).join() ===
                    placeholders(family.values(), { skipCount: true }).join();
                const countKept =
                    !placeholders(enFamily.values()).includes('count') ||
                    placeholders(family.values()).includes('count');
                return sameOthers && countKept ? [] : [base];
            });
            expect(mismatched).toEqual([]);
        });
    });
});
