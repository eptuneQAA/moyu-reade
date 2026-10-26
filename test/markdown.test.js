import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseMarkdown, stripMarkdownInline } from '../src/parsers/markdown.js';
import { parseFile } from '../src/parsers/index.js';

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-md-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

test('parseMarkdown reads title, front matter and headings', () => {
  const file = tmpFile(
    'book.md',
    [
      '---',
      'title: Front Matter',
      '---',
      '',
      '# 测试书',
      '前言',
      '',
      '## 第一章 开始',
      '正文一',
      '',
      '## 第二章 继续',
      '**正文二**'
    ].join('\n')
  );

  const book = parseMarkdown(file);
  assert.equal(book.format, 'md');
  assert.equal(book.title, '测试书');
  assert.equal(book.lines[0], '# 测试书');
  assert.deepEqual(
    book.chapters.map((chapter) => chapter.title),
    ['测试书', '第一章 开始', '第二章 继续']
  );
  assert.deepEqual(
    book.chapters.map((chapter) => chapter.startLine),
    [0, 3, 6]
  );
  assert.equal(parseFile(file).format, 'md');
});

test('parseMarkdown falls back to a single chapter without headings', () => {
  const file = tmpFile('plain.md', '正文一\n正文二\n');
  const book = parseMarkdown(file);
  assert.equal(book.title, 'plain');
  assert.deepEqual(book.chapters, [{ title: 'plain', startLine: 0 }]);
});

test('stripMarkdownInline removes common inline syntax', () => {
  assert.equal(
    stripMarkdownInline('**粗体** [链接](https://x) ![图](a.png)'),
    '粗体 链接 图'
  );
});
