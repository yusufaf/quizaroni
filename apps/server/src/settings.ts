import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { instanceSettings } from './db/schema';

export const SETTING = {
    registrationMode: 'registration_mode',
    teacherPolicy: 'teacher_policy',
    publicUrl: 'public_url',
    setupCompletedAt: 'setup_completed_at',
} as const;

export type SettingName = keyof typeof SETTING;
export type SettingKey = (typeof SETTING)[SettingName];

export function getSetting(
    db: Pick<Db, 'select'>,
    key: SettingKey
): string | undefined {
    return db
        .select({ value: instanceSettings.value })
        .from(instanceSettings)
        .where(eq(instanceSettings.key, key))
        .get()?.value;
}

// A plain insert, not an upsert: the primary key keeps settings such as
// setup_completed_at write-once.
export function insertSettings(
    tx: Pick<Db, 'insert'>,
    entries: Partial<Record<SettingName, string>>,
    now: Date
): void {
    const rows = Object.entries(entries).flatMap(([name, value]) =>
        value === undefined
            ? []
            : [{ key: SETTING[name as SettingName], value, updatedAt: now }]
    );
    if (rows.length > 0) tx.insert(instanceSettings).values(rows).run();
}
