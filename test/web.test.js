import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG, saveConfig } from '../src/config.js';
import { startWebServer } from '../src/web/server.js';

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const data = await response.json();
  assert.ok(
    response.ok,
    `${response.status} ${JSON.stringify(data)}`
  );
  return data;
}

test('web API serves library, chapters, search and progress', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-web-'));
  const booksDir = path.join(root, 'books');
  fs.mkdirSync(booksDir, { recursive: true });
  fs.writeFileSync(
    path.join(booksDir, 'demo.txt'),
    '第一章 开始\n你好世界\n这是第一章。\n\n第二章 继续\n再见世界\n这是第二章。\n'
  );

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
    const library = await fetchJson(`${server.url}/api/library`);
    assert.equal(library.books.length, 1);
    const book = library.books[0];
    assert.equal(book.title, 'demo');
    assert.equal(book.format, 'txt');
    assert.equal(book.hasCover, false);

    const detail = await fetchJson(`${server.url}/api/books/${book.id}`);
    assert.equal(detail.chapters.length, 2);
    assert.equal(detail.chapters[0].title, '第一章 开始');
    assert.equal(detail.progress, null);

    const chapter = await fetchJson(
      `${server.url}/api/books/${book.id}/chapter/0`
    );
    assert.ok(chapter.lines.some((line) => line.text.includes('你好世界')));
    assert.equal(chapter.totalChapters, 2);

    const search = await fetchJson(
      `${server.url}/api/books/${book.id}/search?q=${encodeURIComponent('世界')}`
    );
    assert.equal(search.results.length, 2);
    assert.equal(search.results[0].chapterIndex, 0);
    assert.equal(search.results[1].chapterIndex, 1);

    const forbidden = await fetch(
      `${server.url}/api/books/${book.id}/progress`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: 10 })
      }
    );
    assert.equal(forbidden.status, 403);

    const saved = await fetchJson(
      `${server.url}/api/books/${book.id}/progress`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Moyu': '1'
        },
        body: JSON.stringify({ offset: 10 })
      }
    );
    assert.equal(saved.offset, 10);

    const progress = await fetchJson(
      `${server.url}/api/books/${book.id}/progress`
    );
    assert.equal(progress.offset, 10);

    const cover = await fetch(`${server.url}/api/books/${book.id}/cover`);
    assert.equal(cover.status, 404);

    const imported = await fetchJson(
      `${server.url}/api/import?name=${encodeURIComponent('导入测试.txt')}`,
      {
        method: 'POST',
        headers: { 'X-Moyu': '1' },
        body: '第一章 导入\n测试内容\n'
      }
    );
    assert.equal(imported.name, '导入测试.txt');
    assert.ok(fs.existsSync(path.join(booksDir, '导入测试.txt')));

    const importedLibrary = await fetchJson(`${server.url}/api/library`);
    assert.equal(importedLibrary.books.length, 2);
    assert.ok(
      importedLibrary.books.some((item) => item.title === '导入测试')
    );

    const duplicate = await fetchJson(
      `${server.url}/api/import?name=${encodeURIComponent('导入测试.txt')}`,
      {
        method: 'POST',
        headers: { 'X-Moyu': '1' },
        body: 'x'
      }
    );
    assert.equal(duplicate.name, '导入测试 (1).txt');
    assert.ok(fs.existsSync(path.join(booksDir, '导入测试 (1).txt')));

    const unsupported = await fetch(
      `${server.url}/api/import?name=bad.mobi`,
      {
        method: 'POST',
        headers: { 'X-Moyu': '1' },
        body: 'x'
      }
    );
    assert.equal(unsupported.status, 400);

    const unauthenticated = await fetch(
      `${server.url}/api/import?name=nope.txt`,
      { method: 'POST', body: 'x' }
    );
    assert.equal(unauthenticated.status, 403);

    const markdown = await fetchJson(
      `${server.url}/api/import?name=${encodeURIComponent('说明.md')}`,
      {
        method: 'POST',
        headers: { 'X-Moyu': '1' },
        body: '# 说明\n正文'
      }
    );
    assert.equal(markdown.name, '说明.md');

    const markdownLibrary = await fetchJson(`${server.url}/api/library`);
    const markdownBook = markdownLibrary.books.find(
      (item) => item.title === '说明'
    );
    assert.ok(markdownBook);
    const markdownDetail = await fetchJson(
      `${server.url}/api/books/${markdownBook.id}`
    );
    assert.equal(markdownDetail.format, 'md');
    assert.ok(
      markdownDetail.chapters.some((chapter) => chapter.title === '说明')
    );

    const hidden = await fetchJson(
      `${server.url}/api/books/${book.id}/hide`,
      { method: 'POST', headers: { 'X-Moyu': '1' } }
    );
    assert.equal(hidden.hidden, true);
    assert.ok(fs.existsSync(path.join(booksDir, 'demo.txt')));

    const hiddenLibrary = await fetchJson(`${server.url}/api/library`);
    assert.equal(
      hiddenLibrary.books.find((item) => item.id === book.id).hidden,
      true
    );

    await fetchJson(`${server.url}/api/books/${book.id}/unhide`, {
      method: 'POST',
      headers: { 'X-Moyu': '1' }
    });
    const unhiddenLibrary = await fetchJson(`${server.url}/api/library`);
    assert.equal(
      unhiddenLibrary.books.find((item) => item.id === book.id).hidden,
      false
    );

    const txtBook = unhiddenLibrary.books.find(
      (item) => item.title === '导入测试'
    );
    assert.ok(txtBook.deletable);
    const deleted = await fetchJson(
      `${server.url}/api/books/${txtBook.id}/file`,
      { method: 'DELETE', headers: { 'X-Moyu': '1' } }
    );
    assert.equal(deleted.deleted, true);
    assert.ok(!fs.existsSync(path.join(booksDir, '导入测试.txt')));

    const deletedLibrary = await fetchJson(`${server.url}/api/library`);
    assert.ok(
      !deletedLibrary.books.some((item) => item.id === txtBook.id)
    );

    const unauthenticatedDelete = await fetch(
      `${server.url}/api/books/${book.id}/file`,
      { method: 'DELETE' }
    );
    assert.equal(unauthenticatedDelete.status, 403);
  } finally {
    await server.close();
    if (oldConfig === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = oldConfig;
    if (oldCache === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = oldCache;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
