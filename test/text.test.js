import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTitle,
  decodeEntities,
  htmlToLines,
  detectChapterStarts,
  splitChapters
} from '../src/parsers/text.js';

test('cleanTitle strips trailing bracket metadata', () => {
  assert.equal(cleanTitle('凡人修仙传 [更新至第一千六百章]'), '凡人修仙传');
  assert.equal(cleanTitle('凡人修仙传【全本】'), '凡人修仙传');
  assert.equal(cleanTitle('[综]某书'), '[综]某书');
});

test('decodeEntities decodes named and numeric entities', () => {
  assert.equal(decodeEntities('a&amp;b &#20013; &#x6587; &lt;'), 'a&b 中 文 <');
});

test('htmlToLines strips markup and keeps paragraph breaks', () => {
  const html =
    '<html><style>p{}</style><body><h1>第一章</h1>' +
    '<p>你好<br/>世界</p><script>x()</script></body></html>';
  assert.deepEqual(htmlToLines(html), ['第一章', '你好', '世界']);
});

test('detectChapterStarts finds chapter headings', () => {
  const lines = ['前言文字', '第一章 开始', '正文', '', '第2章 继续', '正文'];
  assert.deepEqual(detectChapterStarts(lines), [
    { title: '第一章 开始', startLine: 1 },
    { title: '第2章 继续', startLine: 4 }
  ]);
});

test('splitChapters falls back to fixed chunks without headings', () => {
  const lines = Array.from({ length: 7 }, (_, i) => `line${i}`);
  assert.deepEqual(splitChapters(lines, 3), [
    { title: '分卷 1', startLine: 0 },
    { title: '分卷 2', startLine: 3 },
    { title: '分卷 3', startLine: 6 }
  ]);
});
