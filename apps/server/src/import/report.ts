import { printable } from '../moderation/cli';
import { type ImportReport, SKIPPED_USER_KINDS } from './plan';

const EXAMPLES = 5;

/** The counts, then each anomaly kind with a few examples; skipped users in full. */
export function formatReport(r: ImportReport): string[] {
    const lines = ['Counts:'];
    for (const [key, n] of Object.entries(r.counts).sort(([a], [b]) =>
        a.localeCompare(b)
    )) {
        lines.push(`  ${key}: ${n}`);
    }
    const byKind = new Map<string, ImportReport['anomalies']>();
    for (const a of r.anomalies) {
        byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
    }
    if (byKind.size === 0) {
        lines.push('Anomalies: none');
        return lines;
    }
    lines.push('Anomalies:');
    for (const [kind, list] of [...byKind].sort(([a], [b]) =>
        a.localeCompare(b)
    )) {
        const all = (SKIPPED_USER_KINDS as readonly string[]).includes(kind);
        lines.push(`  ${kind}: ${list.length}`);
        for (const a of all ? list : list.slice(0, EXAMPLES)) {
            const detail =
                a.detail === undefined ? '' : ` (${printable(a.detail, 120)})`;
            lines.push(`    ${printable(a.id, 80)}${detail}`);
        }
        if (!all && list.length > EXAMPLES) {
            lines.push(`    … and ${list.length - EXAMPLES} more (see --report)`);
        }
    }
    return lines;
}
