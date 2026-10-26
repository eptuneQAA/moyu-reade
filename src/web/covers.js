import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readEpubCover } from '../parsers/epub.js';
import { hasPdftoppm } from './library.js';
import { cacheDir } from './paths.js';

const coverCache = new Map();

function normalizeMime(mime) {
  if (!mime) return 'image/jpeg';
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

function pdfCover(id, file) {
  if (!hasPdftoppm()) return null;
  const dir = path.join(cacheDir(), 'covers');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `${id}.png`);
  if (!fs.existsSync(target)) {
    const prefix = target.replace(/\.png$/i, '');
    try {
      execFileSync(
        'pdftoppm',
        ['-f', '1', '-singlefile', '-scale-to', '600', '-png', file, prefix],
        { stdio: 'ignore', timeout: 20000 }
      );
    } catch {
      return null;
    }
  }
  if (!fs.existsSync(target)) return null;
  return { mime: 'image/png', data: fs.readFileSync(target) };
}

export function getCover(id, file, format) {
  if (coverCache.has(id)) return coverCache.get(id);

  let cover = null;
  try {
    if (format === 'epub') {
      const epubCover = readEpubCover(file);
      if (epubCover) {
        cover = {
          mime: normalizeMime(epubCover.mime),
          data: epubCover.data
        };
      }
    } else if (format === 'pdf') {
      cover = pdfCover(id, file);
    }
  } catch {
    cover = null;
  }

  coverCache.set(id, cover);
  return cover;
}
