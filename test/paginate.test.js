import test from 'node:test';
import assert from 'node:assert/strict';
import stringWidth from 'string-width';
import {
  charWidth,
  wrapLine,
  buildRows,
  offsetToRow,
  truncateToWidth
} from '../src/core/paginate.js';

test('charWidth treats CJK as two columns and ASCII as one', () => {
  assert.equal(charWidth('中'), 2);
  assert.equal(charWidth('a'), 1);
  assert.equal(stringWidth('中文ab'), 6);
});

test('wrapLine wraps CJK by display width', () => {
  const rows = wrapLine('一二三四五', 4);
  assert.deepEqual(rows.map((r) => r.text), ['一二', '三四', '五']);
  assert.deepEqual(rows.map((r) => r.col), [0, 2, 4]);
});

test('wrapLine does not split ASCII words when avoidable', () => {
  const rows = wrapLine('hello world', 8);
  assert.deepEqual(rows.map((r) => r.text), ['hello', 'world']);
});

test('buildRows records absolute offsets', () => {
  const lines = ['ab', '', '中文'];
  const rows = buildRows(lines, 3, [0, 3, 4]);
  assert.deepEqual(
    rows.map((r) => [r.text, r.start]),
    [
      ['ab', 0],
      ['', 3],
      ['中', 4],
      ['文', 5]
    ]
  );
});

test('offsetToRow finds the row containing an offset', () => {
  const rows = [{ start: 0 }, { start: 5 }, { start: 10 }];
  assert.equal(offsetToRow(rows, 0), 0);
  assert.equal(offsetToRow(rows, 7), 1);
  assert.equal(offsetToRow(rows, 99), 2);
});

test('truncateToWidth respects display width', () => {
  assert.equal(truncateToWidth('一二三四', 5), '一二');
});
