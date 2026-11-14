import { createTransport } from 'nodemailer';
import type { SmtpConfig } from './config';
import type { MailTransport } from './mailer';

export function smtpTransport(cfg: SmtpConfig): MailTransport {
    const transporter = createTransport(
        {
            host: cfg.host,
            port: cfg.port,
            secure: cfg.security === 'tls',
            requireTLS: cfg.security === 'starttls',
            ignoreTLS: cfg.security === 'none',
            ...(cfg.auth ? { auth: cfg.auth } : {}),
            // Debug output would include the AUTH exchange.
            logger: false,
            debug: false,
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 20_000,
        },
        { from: cfg.from }
    );
    return {
        send: async (m) => {
            await transporter.sendMail({
                to: m.to,
                subject: m.subject,
                text: m.text,
            });
        },
        verify: async () => {
            await transporter.verify();
        },
    };
}
