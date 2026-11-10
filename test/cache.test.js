import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG, saveConfig } from '../src/config.js';
import {
  createBook,
  layout,
  layoutCacheSize,
  layoutCached
} from '../src/core/book.js';
import { bookCacheInfo, startWebServer } from '../src/web/server.js';

function makeBook(lines) {
  return createBook({
    name: 'demo',
    format: 'txt',
    title: 'demo',
    lines,
    chapters: [{ index: 0, title: '第一章', startLine: 0 }]
  });
}

test('layoutCached reuses rows for the same width and caps widths', () => {
  const book = makeBook(['第一章 开始', '你好世界，这是一段用来测试排版缓存的中文正文。']);
  const chapters = new Set([0]);

  const first = layoutCached(book, 40, { indent: true, chapterStarts: chapters });
  const again = layoutCached(book, 40, { indent: true, chapterStarts: chapters });
  assert.equal(first, again, '同宽度应直接命中缓存');
  assert.equal(layoutCacheSize(book), 1);

  const narrow = layoutCached(book, 20, { indent: true, chapterStarts: chapters });
  assert.notEqual(narrow, first);
  assert.equal(layoutCacheSize(book), 2);

  // 第三种宽度会把最早的挤掉
  layoutCached(book, 60, { indent: true, chapterStarts: chapters });
  assert.equal(layoutCacheSize(book), 2);

  // 淘汰后重新计算的结果必须和直接 layout 一致
  assert.deepEqual(
    layout(book, 40, { indent: true, chapterStarts: chapters }),
    layoutCached(book, 40, { indent: true, chapterStarts: chapters })
  );
});

test('web server book cache evicts beyond its limit', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-cache-'));
  const booksDir = path.join(root, 'books');
  fs.mkdirSync(booksDir, { recursive: true });
  for (let i = 0; i < 6; i += 1) {
    fs.writeFileSync(
      path.join(booksDir, `book-${i}.txt`),
      `第一章 开始\n第 ${i} 本的内容\n`.repeat(40)
    );
  }

  const oldConfig = process.env.XDG_CONFIG_HOME;
  const oldCache = process.env.XDG_CACHE_HOME;
  process.env.XDG_CONFIG_HOME = path.join(root, 'config');
  process.env.XDG_CACHE_HOME = path.join(root, 'cache');
  saveConfig({ ...DEFAULT_CONFIG, booksDirs: [booksDir] });

  const server = await startWebServer({
    port: 0,
    open: false,
    reuse: false,
    quiet: true
  });

  try {
    const library = await (await fetch(`${server.url}/api/library`)).json();
    assert.equal(library.books.length, 6);

    for (const book of library.books) {
      const response = await fetch(`${server.url}/api/books/${book.id}`);
      assert.equal(response.status, 200);
    }

    const info = bookCacheInfo();
    assert.ok(info.size <= 4, `缓存条目应受限，实际 ${info.size}`);
    assert.ok(info.chars <= 24 * 1024 * 1024);
  } finally {
    await server.close();
    if (oldConfig === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = oldConfig;
    if (oldCache === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = oldCache;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
