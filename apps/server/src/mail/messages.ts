import type { MailMessage } from './mailer';

// Plain text, English only. The link sits alone on its own line so mail
// clients make it clickable.

function expiry(expiresAt: Date): string {
    return expiresAt.toUTCString();
}

export function passwordResetMessage(o: {
    to: string;
    name: string;
    link: string;
    publicUrl: string;
    expiresAt: Date;
}): MailMessage {
    return {
        kind: 'password_reset',
        to: o.to,
        subject: 'Reset your Quizaroni password',
        link: o.link,
        expiresAt: o.expiresAt,
        text: [
            `Hi ${o.name},`,
            '',
            `Someone asked to reset the password for your Quizaroni account at ${o.publicUrl}.`,
            'Open this link to choose a new password:',
            '',
            o.link,
            '',
            `The link works once and expires ${expiry(o.expiresAt)}.`,
            "If you didn't ask for this, you can ignore this email; your password stays the same.",
        ].join('\n'),
    };
}

export function inviteMessage(o: {
    to: string;
    link: string;
    publicUrl: string;
    expiresAt: Date;
}): MailMessage {
    return {
        kind: 'invite',
        to: o.to,
        subject: "You're invited to Quizaroni",
        link: o.link,
        expiresAt: o.expiresAt,
        text: [
            'Hi,',
            '',
            `You've been invited to create an account on the Quizaroni server at ${o.publicUrl}.`,
            'Open this link to sign up:',
            '',
            o.link,
            '',
            `The invite expires ${expiry(o.expiresAt)}.`,
        ].join('\n'),
    };
}
