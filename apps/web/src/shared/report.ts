import { useTranslation } from 'react-i18next';

// Same address as SECURITY.md. A report endpoint is deferred (#138), so
// reports go out as a prefilled email for now.
export const REPORT_EMAIL = 'yusufafzal12@gmail.com';

export type ReportStrings = {
    subject: string;
    intro: string;
    setId: string;
    link: string;
    reason: string;
};

// encodeURIComponent throws on a lone surrogate (a title cut mid-emoji), and
// this runs during render. String.prototype.toWellFormed isn't in Safari 16.0.
const toWellFormed = (value: string) =>
    value.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (match) =>
        match.length === 2 ? match : '�'
    );

// encodeURIComponent, not URLSearchParams: mail clients show its `+` for
// spaces literally. RFC 6068 wants CRLF line breaks in the body.
export const reportMailto = (
    studysetUUID: string,
    origin: string,
    s: ReportStrings
): string => {
    const body = [
        s.intro,
        '',
        `${s.setId}: ${studysetUUID}`,
        `${s.link}: ${origin}/view/${studysetUUID}`,
        '',
        `${s.reason}: `,
    ].join('\r\n');
    return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(toWellFormed(s.subject))}&body=${encodeURIComponent(toWellFormed(body))}`;
};

export const useReportHref = (studysetUUID: string, title: string): string => {
    const { t } = useTranslation();
    return reportMailto(studysetUUID, window.location.origin, {
        subject: t('report.emailSubject', { title }),
        intro: t('report.emailIntro'),
        setId: t('report.setId'),
        link: t('report.setLink'),
        reason: t('report.reason'),
    });
};
