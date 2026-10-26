import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { cleanTitle } from '../parsers/text.js';
import { readEpubMetadata } from '../parsers/epub.js';
import { expandHome, scanBooks } from '../core/library.js';
import { bookKey, loadProgress } from '../core/store.js';
import { loadConfig } from '../config.js';

const metaCache = new Map();
let pdfCoverChecked;

export function hasPdftoppm() {
  if (pdfCoverChecked === undefined) {
    try {
      execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
      pdfCoverChecked = true;
    } catch {
      pdfCoverChecked = false;
    }
  }
  return pdfCoverChecked;
}

function formatOf(file) {
  return path.extname(file).slice(1).toLowerCase();
}

function getMeta(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }

  const cached = metaCache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.meta;

  const format = formatOf(file);
  const fallbackTitle = cleanTitle(path.basename(file, path.extname(file)));
  let meta = {
    title: fallbackTitle,
    author: null,
    format,
    hasCover: false
  };

  if (format === 'epub') {
    try {
      const info = readEpubMetadata(file);
      meta = {
        title: info.title || fallbackTitle,
        author: info.author || null,
        format,
        hasCover: Boolean(info.coverPath)
      };
    } catch {
      // 元数据读取失败时回退到文件名
    }
  } else if (format === 'pdf') {
    meta.hasCover = hasPdftoppm();
  }

  metaCache.set(file, { mtimeMs: stat.mtimeMs, meta });
  return meta;
}

export function getLibrary() {
  const config = loadConfig();
  const progress = loadProgress();
  const scanned = scanBooks(config.booksDirs);
  const seen = new Set();
  const books = [];
  const roots = (config.booksDirs || []).map((dir) =>
    path.resolve(expandHome(dir))
  );
  const hidden = new Set(
    (config.hiddenBooks || []).map((file) => path.resolve(file))
  );

  const isDeletable = (file) =>
    roots.some(
      (root) => file === root || file.startsWith(`${root}${path.sep}`)
    );

  for (const item of scanned) {
    const meta = getMeta(item.path);
    if (!meta) continue;
    const id = bookKey(item.path);
    if (seen.has(id)) continue;
    seen.add(id);
    const saved = progress.books[id];
    books.push({
      id,
      path: item.path,
      ...meta,
      percent: saved ? saved.percent ?? 0 : 0,
      updatedAt: saved ? saved.updatedAt ?? null : null,
      missing: false,
      hidden: hidden.has(item.path),
      deletable: isDeletable(item.path)
    });
  }

  for (const [id, saved] of Object.entries(progress.books)) {
    if (seen.has(id)) continue;
    const format = formatOf(saved.path);
    const file = path.resolve(saved.path);
    books.push({
      id,
      path: saved.path,
      title: saved.title || cleanTitle(path.basename(saved.path)),
      author: null,
      format,
      hasCover: false,
      percent: saved.percent ?? 0,
      updatedAt: saved.updatedAt ?? null,
      missing: !fs.existsSync(saved.path),
      hidden: hidden.has(file),
      deletable: isDeletable(file)
    });
  }

  books.sort((a, b) => {
    const at = a.updatedAt || '';
    const bt = b.updatedAt || '';
    if (at !== bt) return bt.localeCompare(at);
    return a.title.localeCompare(b.title, 'zh');
  });

  return { books, dirs: config.booksDirs };
}

export function findBook(id) {
  return getLibrary().books.find((book) => book.id === id) || null;
}
