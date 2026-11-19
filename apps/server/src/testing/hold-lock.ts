import { join } from 'node:path';

// Starts the hold-data-dir-lock fixture and resolves once it holds the lock.
export async function holdDataDirLock(
    dataDir: string
): Promise<{ stop(): Promise<void> }> {
    const child = Bun.spawn(
        [
            process.execPath,
            join(import.meta.dir, 'fixtures', 'hold-data-dir-lock.ts'),
            dataDir,
        ],
        { stdout: 'pipe', stderr: 'pipe' }
    );
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    let seen = '';
    while (!seen.includes('locked')) {
        const { value, done } = await reader.read();
        if (done) {
            throw new Error(
                `hold-data-dir-lock exited early: ${await new Response(child.stderr).text()}`
            );
        }
        seen += decoder.decode(value);
    }
    reader.releaseLock();
    return {
        async stop() {
            child.kill();
            await child.exited;
        },
    };
}
