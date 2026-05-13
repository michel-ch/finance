import fs from 'node:fs';
import path from 'node:path';

// Remove the intermediate ndjson log after all workers have finished.
// The aggregated qa-pages-1-report.json is the only artifact to keep.
export default async function globalTeardown() {
  const p = path.resolve('qa-pages-1-raw.ndjson');
  try { fs.unlinkSync(p); } catch {}
}
