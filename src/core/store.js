import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { configDir, readJson, atomicWrite } from '../config.js';

export function bookKey(file) {
  let real;
  try {
    real = fs.realpathSync(file);
  } catch {
    real = path.resolve(file);
  }
  return crypto.createHash('sha1').update(real).digest('hex');
}

export function loadProgress() {
  const file = path.join(configDir(), 'progress.json');
  const data = readJson(file);
  if (data === null && fs.existsSync(file)) {
    try {
      fs.copyFileSync(file, `${file}.bak`);
    } catch {
      // 忽略备份失败
    }
  }
  if (
    data &&
    typeof data === 'object' &&
    data.books &&
    typeof data.books === 'object'
  ) {
    return data;
  }
  return { books: {} };
}

export function saveProgress(progress) {
  atomicWrite(
    path.join(configDir(), 'progress.json'),
    `${JSON.stringify(progress, null, 2)}\n`
  );
}
