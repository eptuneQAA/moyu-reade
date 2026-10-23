import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chapterAt,
  createBook,
  layout,
  offsetForLine,
  percentForOffset,
  searchBook
} from '../src/core/book.js';

function makeBook() {
  return createBook({
    title: '测试书',
    author: null,
    format: 'txt',
    sourcePath: '/tmp/a.txt',
    lines: ['第一章 开始', '你好世界', '再见 世界'],
    chapters: [{ title: '第一章 开始', startLine: 0 }],
    pageStarts: null
  });
}

test('createBook computes line starts and text length', () => {
  const book = makeBook();
  assert.equal(book.lineStarts[0], 0);
  assert.equal(book.lineStarts[1], '第一章 开始'.length + 1);
  assert.deepEqual(offsetForLine(book, 2), book.lineStarts[2]);
});

test('chapterAt locates the containing chapter', () => {
  const book = makeBook();
  assert.equal(chapterAt(book, 1).title, '第一章 开始');
});

test('searchBook returns offsets and chapter index', () => {
  const book = makeBook();
  const results = searchBook(book, '世界');
  assert.equal(results.length, 2);
  assert.equal(results[0].offset, book.lineStarts[1] + 2);
  assert.equal(results[0].chapterIndex, 0);
  assert.equal(results[1].offset, book.lineStarts[2] + 3);
  assert.ok(results[1].snippet.includes('世界'));
});

test('percentForOffset is clamped', () => {
  const book = makeBook();
  assert.equal(percentForOffset(book, 0), 0);
  assert.equal(percentForOffset(book, book.textLength), 100);
});

test('layout builds display rows', () => {
  const book = makeBook();
  const rows = layout(book, 4);
  assert.equal(rows[0].text, '第一');
  assert.equal(rows[0].line, 0);
  assert.ok(rows.length > book.lines.length);
});
