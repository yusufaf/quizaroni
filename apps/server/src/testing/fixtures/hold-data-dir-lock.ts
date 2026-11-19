// Test helper: holds the data-dir lock until killed, so the parent can prove
// a second server or an import is refused while it runs.
import { acquireDataDirLock } from '../../data-dir-lock';

const dataDir = process.argv[2];
if (!dataDir) throw new Error('usage: hold-data-dir-lock.ts <dataDir>');

const lock = acquireDataDirLock(dataDir);
console.log('locked');
await Bun.sleep(60_000);
lock.release();
