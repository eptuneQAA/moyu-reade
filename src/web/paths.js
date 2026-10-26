import os from 'node:os';
import path from 'node:path';

export function cacheDir() {
  const base =
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'moyu');
}
