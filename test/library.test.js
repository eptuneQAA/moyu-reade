import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expandHome, scanBooks } from '../src/core/library.js';

test('expandHome expands tilde', () => {
  assert.ok(!expandHome('~/Books').startsWith('~'));
  assert.equal(expandHome('/tmp/x'), '/tmp/x');
});

test('scanBooks finds supported files recursively and skips hidden', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-lib-'));
  fs.mkdirSync(path.join(root, 'sub'));
  fs.writeFileSync(path.join(root, 'a.txt'), '');
  fs.writeFileSync(path.join(root, 'sub', 'b.epub'), '');
  fs.writeFileSync(path.join(root, 'sub', 'c.PDF'), '');
  fs.writeFileSync(path.join(root, 'c.md'), '');
  fs.mkdirSync(path.join(root, '.hidden'));
  fs.writeFileSync(path.join(root, '.hidden', 'd.txt'), '');

  const books = scanBooks([root]);
  assert.deepEqual(
    books.map((b) => b.title).sort(),
    ['a', 'b', 'c']
  );
  assert.ok(books.every((b) => path.isAbsolute(b.path)));
  assert.deepEqual(
    books.map((b) => b.format).sort(),
    ['epub', 'pdf', 'txt']
  );
});
