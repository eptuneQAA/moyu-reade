import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import iconv from 'iconv-lite';
import { decodeBuffer, parseTxt } from '../src/parsers/txt.js';

function tmpFile(name, buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-txt-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, buffer);
  return file;
}

test('decodeBuffer handles UTF-8 with BOM', () => {
  const buffer = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from('第一章 你好', 'utf8')
  ]);
  assert.equal(decodeBuffer(buffer), '第一章 你好');
});

test('decodeBuffer falls back to GB18030', () => {
  assert.equal(
    decodeBuffer(iconv.encode('第一章 你好', 'gb18030')),
    '第一章 你好'
  );
});

test('decodeBuffer handles UTF-16LE BOM', () => {
  const buffer = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    iconv.encode('第一章 你好', 'utf16le')
  ]);
  assert.equal(decodeBuffer(buffer), '第一章 你好');
});

test('parseTxt strips bracketed metadata from the filename', () => {
  const file = tmpFile(
    '凡人修仙传 [更新至第一千六百章].txt',
    Buffer.from('第一章 开始\n正文\n\n第二章 继续\n正文\n', 'utf8')
  );
  assert.equal(parseTxt(file).title, '凡人修仙传');
});

test('parseTxt builds metadata and chapters', () => {
  const file = tmpFile(
    '测试书.txt',
    Buffer.from('第一章 开始\n正文一\n\n第二章 继续\n正文二\n', 'utf8')
  );
  const book = parseTxt(file);
  assert.equal(book.title, '测试书');
  assert.equal(book.format, 'txt');
  assert.equal(book.author, null);
  assert.deepEqual(book.chapters, [
    { title: '第一章 开始', startLine: 0 },
    { title: '第二章 继续', startLine: 3 }
  ]);
  assert.equal(book.lines[1], '正文一');
});
