import { createServer, type Server, type Socket } from 'node:net';

// Test helper only: a minimal plain-text SMTP server on 127.0.0.1.

export type FakeSmtp = {
    port: number;
    messages: string[];
    authAttempts: number;
    close(): Promise<void>;
};

export async function startFakeSmtp(
    o: { acceptAuth?: boolean } = {}
): Promise<FakeSmtp> {
    const acceptAuth = o.acceptAuth ?? true;
    const messages: string[] = [];
    const sockets = new Set<Socket>();
    let authAttempts = 0;

    const server: Server = createServer((socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', () => {});
        let buffer = '';
        let data: string[] | undefined;
        const reply = (line: string) => socket.write(`${line}\r\n`);
        reply('220 fake ESMTP');
        socket.on('data', (chunk) => {
            buffer += chunk.toString('latin1');
            let end = buffer.indexOf('\r\n');
            while (end !== -1) {
                const line = buffer.slice(0, end);
                buffer = buffer.slice(end + 2);
                end = buffer.indexOf('\r\n');
                if (data) {
                    if (line === '.') {
                        messages.push(data.join('\r\n'));
                        data = undefined;
                        reply('250 OK queued');
                    } else {
                        data.push(line.startsWith('..') ? line.slice(1) : line);
                    }
                    continue;
                }
                const verb = line.split(' ')[0]?.toUpperCase();
                if (verb === 'EHLO') {
                    socket.write('250-fake\r\n250 AUTH PLAIN LOGIN\r\n');
                } else if (verb === 'HELO') {
                    reply('250 fake');
                } else if (verb === 'AUTH') {
                    authAttempts++;
                    reply(
                        acceptAuth
                            ? '235 Authentication succeeded'
                            : '535 Authentication failed'
                    );
                } else if (verb === 'MAIL' || verb === 'RCPT' || verb === 'RSET' || verb === 'NOOP') {
                    reply('250 OK');
                } else if (verb === 'DATA') {
                    data = [];
                    reply('354 End data with <CR><LF>.<CR><LF>');
                } else if (verb === 'QUIT') {
                    reply('221 Bye');
                    socket.end();
                } else {
                    reply('502 Command not implemented');
                }
            }
        });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') {
        throw new Error('fake SMTP server has no port');
    }
    return {
        port: address.port,
        messages,
        get authAttempts() {
            return authAttempts;
        },
        close: () =>
            new Promise<void>((resolve) => {
                for (const s of sockets) s.destroy();
                server.close(() => resolve());
            }),
    };
}

export function decodeQuotedPrintable(s: string): string {
    return s
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
        );
}
