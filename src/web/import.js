import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { loadConfig } from '../config.js';
import { expandHome } from '../core/library.js';

export const MAX_IMPORT_BYTES = 200 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.txt', '.epub', '.pdf', '.md']);

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function importDir() {
  const config = loadConfig();
  const first = config.booksDirs?.[0] || '~/Documents/Books';
  return path.resolve(expandHome(first));
}

function safeName(raw) {
  const base = path.basename(String(raw || '').replace(/\\/g, '/'));
  return base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

function uniquePath(dir, name) {
  const extension = path.extname(name);
  const stem = path.basename(name, extension);
  let candidate = path.join(dir, name);
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem} (${index})${extension}`);
    index += 1;
  }
  return candidate;
}

export async function receiveImport(req, rawName) {
  const name = safeName(rawName);
  if (!name) throw fail(400, '缺少文件名');

  const extension = path.extname(name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw fail(400, '只支持 TXT / EPUB / PDF / Markdown');
  }

  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_IMPORT_BYTES) {
    throw fail(413, '文件超过 200MB');
  }

  const dir = importDir();
  fs.mkdirSync(dir, { recursive: true });

  const temp = path.join(
    dir,
    `.moyu-import-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.tmp`
  );

  let bytes = 0;
  const limiter = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_IMPORT_BYTES) {
        callback(fail(413, '文件超过 200MB'));
        return;
      }
      callback(null, chunk);
    }
  });

  try {
    await pipeline(
      req,
      limiter,
      fs.createWriteStream(temp, { flags: 'wx', mode: 0o644 })
    );
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }

  if (bytes === 0) {
    fs.rmSync(temp, { force: true });
    throw fail(400, '空文件');
  }

  const target = uniquePath(dir, name);
  try {
    fs.renameSync(temp, target);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }

  return {
    file: target,
    name: path.basename(target),
    dir
  };
}
