// Test helper: holds a write lock on the data dir's DB while an uncommitted
// admin row exists, so the parent can prove completeSetup waits for it.
import { closeDatabase, openDatabase } from '../../db';

const dataDir = process.argv[2];
if (!dataDir) throw new Error('usage: hold-lock.ts <dataDir>');

const { sqlite } = openDatabase(dataDir);
sqlite.run('BEGIN IMMEDIATE');
const now = Date.now();
sqlite.run(
    "INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at) VALUES ('held', 'Held', 'held@example.com', 1, 'admin', ?, ?)",
    [now, now]
);
console.log('locked');
await Bun.sleep(500);
sqlite.run('COMMIT');
console.log('committed');
closeDatabase(sqlite);
