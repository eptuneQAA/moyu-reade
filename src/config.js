import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const DEFAULT_CONFIG = {
  charsPerLine: 72,
  linesPerPage: 0,
  autoPageSeconds: 30,
  booksDirs: ['~/Documents/Books', '~/Downloads'],
  showChapterTitle: true,
  showFooter: true,
  theme: 'paper'
};

export function configDir() {
  const base =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'moyu');
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

export function loadConfig() {
  const file = path.join(configDir(), 'config.json');
  const data = readJson(file);
  if (data === null && fs.existsSync(file)) {
    try {
      fs.copyFileSync(file, `${file}.bak`);
    } catch {
      // 忽略备份失败
    }
  }
  return {
    ...DEFAULT_CONFIG,
    ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {})
  };
}

export function saveConfig(config) {
  atomicWrite(
    path.join(configDir(), 'config.json'),
    `${JSON.stringify(config, null, 2)}\n`
  );
}
