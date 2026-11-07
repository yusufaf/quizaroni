import { isCardFileKey } from '../files/keys';
import type { studyset } from '../db/schema';
import { isPlainObject, type JsonObject } from '../users/metadata';

type Row = typeof studyset.$inferSelect;

export type PublicCardFile = JsonObject & {
    key: string;
    association: 'term' | 'definition';
};

// The only files a public page shows: term and definition images stored
// under the set itself.
export function publicCardFiles(
    card: JsonObject,
    studysetUUID: string
): PublicCardFile[] {
    if (!Array.isArray(card.files)) return [];
    return card.files.filter(
        (file: unknown): file is PublicCardFile =>
            isPlainObject(file) &&
            isCardFileKey(file.key) &&
            file.key.split('/')[0] === studysetUUID &&
            (file.association === 'term' || file.association === 'definition')
    );
}

export function publicFileKeys(
    row: Pick<Row, 'studysetUUID' | 'cards'>
): Set<string> {
    const keys = new Set<string>();
    for (const card of row.cards) {
        if (!isPlainObject(card)) continue;
        for (const file of publicCardFiles(card, row.studysetUUID)) {
            keys.add(file.key);
        }
    }
    return keys;
}
