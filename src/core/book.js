import { buildRows } from './paginate.js';

export function createBook(meta) {
  const lines = meta.lines.length > 0 ? meta.lines : [''];
  const lineStarts = new Array(lines.length);
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStarts[i] = offset;
    offset += lines[i].length + 1;
  }
  return { ...meta, lines, lineStarts, textLength: offset };
}

export function layout(book, width, options = {}) {
  return buildRows(book.lines, width, book.lineStarts, options);
}

// 排版结果按宽度缓存：终端 resize 会连发多个事件，同一宽度重复排版纯属浪费。
// 每个 book 最多保留 2 个宽度（回退到上一个宽度时直接命中），进程内 WeakMap 不阻止回收。
const LAYOUT_CACHE_LIMIT = 2;
const layoutCache = new WeakMap();

export function layoutCached(book, width, options = {}) {
  let entries = layoutCache.get(book);
  if (!entries) {
    entries = new Map();
    layoutCache.set(book, entries);
  }
  const key = `${width}|${options.indent ? 1 : 0}|${options.chapterStarts ? options.chapterStarts.size : 0}`;
  const cached = entries.get(key);
  if (cached) return cached;
  const rows = layout(book, width, options);
  entries.set(key, rows);
  while (entries.size > LAYOUT_CACHE_LIMIT) {
    entries.delete(entries.keys().next().value);
  }
  return rows;
}

export function layoutCacheSize(book) {
  const entries = layoutCache.get(book);
  return entries ? entries.size : 0;
}

export function offsetForLine(book, line) {
  const index = Math.max(0, Math.min(line, book.lines.length - 1));
  return book.lineStarts[index];
}

export function chapterAt(book, line) {
  if (book.chapters.length === 0) return null;
  let answer = book.chapters[0];
  for (const chapter of book.chapters) {
    if (chapter.startLine <= line) answer = chapter;
    else break;
  }
  return answer;
}

export function percentForOffset(book, offset) {
  if (!book.textLength) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((offset / book.textLength) * 100))
  );
}

export function searchBook(book, query, limit = 200) {
  const needle = query.toLowerCase();
  if (!needle) return [];
  const results = [];

  for (let i = 0; i < book.lines.length && results.length < limit; i++) {
    const line = book.lines[i];
    const haystack = line.toLowerCase();
    let from = 0;
    while (results.length < limit) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      const left = Math.max(0, index - 12);
      const right = Math.min(line.length, index + query.length + 12);
      results.push({
        chapterIndex: book.chapters.findIndex(
          (c, ci) =>
            c.startLine <= i &&
            (ci === book.chapters.length - 1 ||
              book.chapters[ci + 1].startLine > i)
        ),
        lineIndex: i,
        offset: book.lineStarts[i] + index,
        snippet:
          (left > 0 ? '\u2026' : '') +
          line.slice(left, right) +
          (right < line.length ? '\u2026' : '')
      });
      from = index + Math.max(1, needle.length);
    }
  }
  return results;
}
