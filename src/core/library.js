import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function expandHome(input) {
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

function realOrResolved(file) {
  try {
    return fs.realpathSync(file);
  } catch {
    return path.resolve(file);
  }
}

export function scanBooks(dirs) {
  const books = [];
  const seen = new Set();

  const walk = (dir, depth) => {
    if (depth > 3) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (/\.(txt|epub|pdf|md)$/i.test(entry.name)) {
        const real = realOrResolved(full);
        if (seen.has(real)) continue;
        seen.add(real);
        books.push({
          path: real,
          title: path.basename(entry.name, path.extname(entry.name)),
          format: path.extname(entry.name).slice(1).toLowerCase()
        });
      }
    }
  };

  for (const dir of dirs.map(expandHome)) walk(dir, 0);
  return books;
}
