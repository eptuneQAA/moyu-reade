import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from '../src/args.js';
import { parseFile } from '../src/parsers/index.js';
import { ParseError } from '../src/parsers/error.js';

test('parseArgs handles flags and file', () => {
  assert.deepEqual(parseArgs(['book.txt']), {
    file: 'book.txt',
    library: false,
    resume: true,
    debug: false,
    help: false,
    version: false
  });
  assert.equal(parseArgs(['-l']).library, true);
  assert.equal(parseArgs(['--no-resume']).resume, false);
  assert.equal(parseArgs(['--debug']).debug, true);
  assert.throws(() => parseArgs(['--wat']), /未知参数/);
  assert.throws(() => parseArgs(['a.txt', 'b.txt']), /多余的参数/);
});

test('parseFile rejects missing and unsupported files', () => {
  assert.throws(() => parseFile('/no/such/book.txt'), /文件不存在/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-dispatch-'));
  const file = path.join(dir, 'a.md');
  fs.writeFileSync(file, 'x');
  assert.throws(
    () => parseFile(file),
    (error) => error instanceof ParseError && /不支持的格式/.test(error.message)
  );
});
