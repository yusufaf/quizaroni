import { describe, it, expect } from 'vite-plus/test';
import { REPORT_EMAIL, reportMailto, type ReportStrings } from './report';

const UUID = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'https://quizaroni.test';

const strings = (overrides: Partial<ReportStrings> = {}): ReportStrings => ({
    subject: 'Report: Cell biology',
    intro: 'I would like to report this set.',
    setId: 'Set ID',
    link: 'Link',
    reason: 'Reason',
    ...overrides,
});

describe('reportMailto', () => {
    it('addresses the maintainer and puts the set id and view link in the body', () => {
        const href = reportMailto(UUID, ORIGIN, strings());
        expect(href.startsWith(`mailto:${REPORT_EMAIL}?`)).toBe(true);
        const body = new URL(href).searchParams.get('body')!;
        expect(body).toContain(UUID);
        expect(body).toContain(`${ORIGIN}/view/${UUID}`);
        expect(body.endsWith('Reason: ')).toBe(true);
    });

    it('encodes spaces as %20 and line breaks as CRLF', () => {
        const href = reportMailto(UUID, ORIGIN, strings());
        expect(href).not.toContain('+');
        expect(href).toContain('%20');
        expect(href).toContain('%0D%0A');
        expect(href).not.toContain('\n');
    });

    it('keeps a title with & # ? inside the subject', () => {
        const subject = 'Report: Q&A #1?';
        const href = reportMailto(UUID, ORIGIN, strings({ subject }));
        const params = new URL(href).searchParams;
        expect(params.get('subject')).toBe(subject);
        expect(params.get('body')).toContain(UUID);
    });
});
