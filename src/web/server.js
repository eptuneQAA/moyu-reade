import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBook, percentForOffset, searchBook } from '../core/book.js';
import { parseFile } from '../parsers/index.js';
import { loadConfig, saveConfig } from '../config.js';
import { loadProgress, saveProgress } from '../core/store.js';
import { getLibrary, findBook } from './library.js';
import { getCover } from './covers.js';
import { receiveImport } from './import.js';
import { cacheDir } from './paths.js';
import { VERSION } from '../version.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8'
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const bookCache = new Map();

function webInfoPath() {
  return path.join(cacheDir(), 'web.json');
}

function readWebInfo() {
  try {
    return JSON.parse(fs.readFileSync(webInfoPath(), 'utf8'));
  } catch {
    return null;
  }
}

function writeWebInfo(info) {
  fs.mkdirSync(cacheDir(), { recursive: true });
  const file = webInfoPath();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(info, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function removeWebInfo(port) {
  const info = readWebInfo();
  if (port && info && info.port !== port) return;
  try {
    fs.unlinkSync(webInfoPath());
  } catch {
    // 忽略不存在
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new HttpError(413, 'request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new HttpError(400, 'invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function findWebDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.MOYU_WEB_DIR,
    path.resolve(process.cwd(), 'web/dist'),
    path.resolve(here, '../web/dist'),
    path.resolve(here, '../../web/dist'),
    '/usr/share/moyu/web'
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return candidates[0] || null;
}

function chaptersOf(book) {
  return book.chapters.map((chapter, index) => {
    const next = book.chapters[index + 1];
    return {
      index,
      title: chapter.title,
      startLine: chapter.startLine,
      startOffset: book.lineStarts[chapter.startLine],
      endOffset: next ? book.lineStarts[next.startLine] : book.textLength
    };
  });
}

function loadBook(entry) {
  const stat = fs.statSync(entry.path);
  const cached = bookCache.get(entry.id);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.book;

  const book = createBook(parseFile(entry.path));
  bookCache.set(entry.id, { mtimeMs: stat.mtimeMs, book });
  return book;
}

function entryFor(id) {
  if (!/^[0-9a-f]{40}$/.test(id)) throw new HttpError(404, 'book not found');
  const entry = findBook(id);
  if (!entry || entry.missing) throw new HttpError(404, 'book not found');
  return entry;
}

function bookDetail(id) {
  const entry = entryFor(id);
  const book = loadBook(entry);
  const saved = loadProgress().books[entry.id] || null;
  return {
    id: entry.id,
    title: book.title || entry.title,
    author: entry.author,
    format: entry.format,
    textLength: book.textLength,
    chapters: chaptersOf(book),
    progress: saved
      ? {
          offset: saved.offset ?? 0,
          percent: saved.percent ?? 0,
          updatedAt: saved.updatedAt ?? null
        }
      : null
  };
}

function chapterContent(id, index) {
  const entry = entryFor(id);
  const book = loadBook(entry);
  const chapters = chaptersOf(book);
  if (!Number.isInteger(index) || index < 0 || index >= chapters.length) {
    throw new HttpError(404, 'chapter not found');
  }
  const chapter = chapters[index];
  const next = chapters[index + 1];
  const endLine = next ? next.startLine : book.lines.length;
  const lines = [];
  for (let line = chapter.startLine; line < endLine; line++) {
    lines.push({
      text: book.lines[line],
      offset: book.lineStarts[line]
    });
  }
  return {
    index,
    title: chapter.title,
    startOffset: chapter.startOffset,
    endOffset: chapter.endOffset,
    totalChapters: chapters.length,
    lines
  };
}

function saveBookProgress(id, body) {
  const entry = entryFor(id);
  const book = loadBook(entry);
  const offset = Number(body.offset);
  if (!Number.isFinite(offset)) throw new HttpError(400, 'invalid offset');
  const clamped = Math.max(0, Math.min(offset, book.textLength));
  const percent = Number(percentForOffset(book, clamped).toFixed(1));
  const progress = loadProgress();
  progress.books[entry.id] = {
    path: entry.path,
    title: entry.title,
    offset: clamped,
    percent,
    updatedAt: new Date().toISOString()
  };
  saveProgress(progress);
  return progress.books[entry.id];
}

function hideBook(id) {
  const entry = entryFor(id);
  const config = loadConfig();
  const hidden = new Set(config.hiddenBooks || []);
  hidden.add(entry.path);
  config.hiddenBooks = [...hidden];
  saveConfig(config);
  return { ok: true, hidden: true, name: entry.title };
}

function unhideBook(id) {
  const entry = entryFor(id);
  const config = loadConfig();
  config.hiddenBooks = (config.hiddenBooks || []).filter(
    (file) => path.resolve(file) !== path.resolve(entry.path)
  );
  saveConfig(config);
  return { ok: true, hidden: false, name: entry.title };
}

function deleteBookFile(id) {
  const entry = entryFor(id);
  if (!entry.deletable) {
    throw new HttpError(403, '只能删除书库目录内的文件');
  }

  try {
    fs.unlinkSync(entry.path);
  } catch (error) {
    if (error.code === 'ENOENT') throw new HttpError(404, '文件不存在');
    throw error;
  }

  const progress = loadProgress();
  delete progress.books[entry.id];
  saveProgress(progress);

  const config = loadConfig();
  config.hiddenBooks = (config.hiddenBooks || []).filter(
    (file) => path.resolve(file) !== path.resolve(entry.path)
  );
  saveConfig(config);

  fs.rmSync(path.join(cacheDir(), 'covers', `${entry.id}.png`), {
    force: true
  });
  bookCache.delete(entry.id);

  return { ok: true, deleted: true, name: entry.title };
}

async function handleApi(req, res, url, context) {
  const method = req.method || 'GET';
  const parts = url.pathname.split('/').filter(Boolean);

  if (method !== 'GET' && req.headers['x-moyu'] !== '1') {
    throw new HttpError(403, 'forbidden');
  }

  if (parts[1] === 'ping' && method === 'GET') {
    return sendJson(res, 200, { ok: true, version: VERSION });
  }

  if (parts[1] === 'library' && method === 'GET') {
    return sendJson(res, 200, getLibrary());
  }

  if (parts[1] === 'scan' && method === 'POST') {
    return sendJson(res, 200, getLibrary());
  }

  if (parts[1] === 'import' && method === 'POST') {
    const result = await receiveImport(
      req,
      url.searchParams.get('name') || ''
    );
    return sendJson(res, 200, {
      ok: true,
      name: result.name,
      file: result.file,
      dir: result.dir
    });
  }

  if (parts[1] === 'shutdown' && method === 'POST') {
    sendJson(res, 200, { ok: true });
    context.onShutdown();
    return;
  }

  if (parts[1] !== 'books' || !parts[2]) {
    throw new HttpError(404, 'not found');
  }

  const id = parts[2];
  if (!/^[0-9a-f]{40}$/.test(id)) throw new HttpError(404, 'book not found');

  if (parts.length === 3 && method === 'GET') {
    return sendJson(res, 200, bookDetail(id));
  }

  if (parts[3] === 'chapter' && method === 'GET') {
    const index = Number(parts[4]);
    return sendJson(res, 200, chapterContent(id, index));
  }

  if (parts[3] === 'cover' && method === 'GET') {
    const entry = entryFor(id);
    const cover = getCover(entry.id, entry.path, entry.format);
    if (!cover) throw new HttpError(404, 'cover not found');
    res.writeHead(200, {
      'Content-Type': cover.mime,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': cover.data.length
    });
    res.end(cover.data);
    return;
  }

  if (parts[3] === 'search' && method === 'GET') {
    const query = (url.searchParams.get('q') || '').trim();
    if (!query) return sendJson(res, 200, { results: [] });
    const entry = entryFor(id);
    const book = loadBook(entry);
    const results = searchBook(book, query, 100).map((result) => ({
      ...result,
      chapterTitle: book.chapters[result.chapterIndex]?.title || ''
    }));
    return sendJson(res, 200, { results });
  }

  if (parts[3] === 'progress' && method === 'GET') {
    const entry = entryFor(id);
    return sendJson(res, 200, loadProgress().books[entry.id] || null);
  }

  if (parts[3] === 'progress' && method === 'PUT') {
    const body = await readBody(req);
    return sendJson(res, 200, saveBookProgress(id, body));
  }

  if (parts[3] === 'hide' && method === 'POST') {
    return sendJson(res, 200, hideBook(id));
  }

  if (parts[3] === 'unhide' && method === 'POST') {
    return sendJson(res, 200, unhideBook(id));
  }

  if (parts[3] === 'file' && method === 'DELETE') {
    return sendJson(res, 200, deleteBookFile(id));
  }

  throw new HttpError(404, 'not found');
}

function serveStatic(req, res, pathname, webDir) {
  if (!webDir) {
    return sendText(
      res,
      503,
      'moyu web UI is not built. Run: npm run build:web'
    );
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return sendText(res, 400, 'bad request');
  }

  if (decoded.includes('\0')) return sendText(res, 400, 'bad request');

  let relative = decoded.replace(/^\/+/, '');
  if (!relative) relative = 'index.html';

  const file = path.resolve(webDir, relative);
  if (file !== webDir && !file.startsWith(webDir + path.sep)) {
    return sendText(res, 403, 'forbidden');
  }

  let target = file;
  try {
    if (fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    fs.statSync(target);
  } catch {
    if (!path.extname(decoded)) {
      target = path.join(webDir, 'index.html');
      try {
        fs.statSync(target);
      } catch {
        return sendText(res, 404, 'not found');
      }
    } else {
      return sendText(res, 404, 'not found');
    }
  }

  const ext = path.extname(target).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': target.includes(`${path.sep}assets${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  };
  res.writeHead(200, headers);
  fs.createReadStream(target).pipe(res);
}

async function handleRequest(req, res, context) {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res, url, context);
  }
  return serveStatic(req, res, url.pathname, context.webDir);
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function openBrowser(url) {
  const platform = process.platform;
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args =
    platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    // 打不开浏览器时仍然打印 URL
  }
}

async function existingServer() {
  const info = readWebInfo();
  if (!info || !info.url) return null;
  try {
    const response = await fetch(`${info.url}/api/ping`, {
      signal: AbortSignal.timeout(700)
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.ok === true) return info;
    }
  } catch {
    // 旧实例已失效
  }
  removeWebInfo();
  return null;
}

export async function startWebServer({
  port = 8787,
  open = true,
  reuse = true,
  host = '127.0.0.1',
  quiet = false,
  initialPath = '/'
} = {}) {
  if (reuse) {
    const existing = await existingServer();
    if (existing) {
      const targetUrl = `${existing.url}${initialPath}`;
      if (open) openBrowser(targetUrl);
      if (!quiet) {
        console.log(`moyu web: ${targetUrl} (already running)`);
      }
      return {
        ...existing,
        targetUrl,
        reused: true,
        close: async () => {}
      };
    }
  }

  const webDir = findWebDir();
  let requestClose = () => {};
  const server = http.createServer((req, res) => {
    const context = { webDir, onShutdown: () => requestClose() };
    handleRequest(req, res, context).catch((error) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      const status =
        error instanceof HttpError
          ? error.status
          : Number(error.status) || 500;
      sendJson(res, status, { error: error.message || 'internal error' });
    });
  });

  let actualPort = port;
  if (port === 0) {
    await listen(server, 0, host);
    actualPort = server.address().port;
  } else {
    let lastError = null;
    for (let offset = 0; offset < 20; offset++) {
      try {
        await listen(server, port + offset, host);
        actualPort = port + offset;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (error.code !== 'EADDRINUSE') break;
      }
    }
    if (lastError) throw lastError;
  }

  const url = `http://${host}:${actualPort}`;
  writeWebInfo({
    pid: process.pid,
    port: actualPort,
    url,
    startedAt: new Date().toISOString()
  });

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    removeWebInfo(actualPort);
    await new Promise((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
  };

  requestClose = () => {
    setTimeout(() => {
      close().catch(() => {});
    }, 50);
  };

  const targetUrl = `${url}${initialPath}`;
  if (open) openBrowser(targetUrl);
  if (!quiet) {
    console.log(`moyu web: ${targetUrl}`);
  }

  return {
    server,
    port: actualPort,
    url,
    targetUrl,
    close,
    reused: false
  };
}
