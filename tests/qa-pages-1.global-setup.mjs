import fs from 'node:fs';
import path from 'node:path';

// Wipe any leftover ndjson from a prior run so this run starts with an empty log.
// Runs ONCE per `playwright test` invocation, before any spec is loaded.
export default async function globalSetup() {
  const p = path.resolve('qa-pages-1-raw.ndjson');
  try { fs.unlinkSync(p); } catch {}
}
