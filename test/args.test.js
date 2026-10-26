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
    command: 'read',
    file: 'book.txt',
    library: false,
    resume: true,
    debug: false,
    help: false,
    version: false,
    port: null,
    open: true,
    url: null
  });
  assert.equal(parseArgs(['-l']).library, true);
  assert.equal(parseArgs(['--no-resume']).resume, false);
  assert.equal(parseArgs(['--debug']).debug, true);
  assert.throws(() => parseArgs(['--wat']), /未知参数/);
  assert.throws(() => parseArgs(['a.txt', 'b.txt']), /多余的参数/);
});

test('parseArgs handles web mode', () => {
  const web = parseArgs(['web', '--port', '9000', '--no-open']);
  assert.equal(web.command, 'web');
  assert.equal(web.port, 9000);
  assert.equal(web.open, false);
  assert.equal(parseArgs(['--web']).command, 'web');
  assert.throws(() => parseArgs(['web', '--port', 'abc']), /无效端口/);
  assert.throws(() => parseArgs(['web', 'a.txt']), /不接受文件/);

  const protocol = parseArgs(['web', 'moyu://shelf']);
  assert.equal(protocol.command, 'web');
  assert.equal(protocol.url, 'moyu://shelf');

  const autoWeb = parseArgs(['moyu://read/' + 'a'.repeat(40)]);
  assert.equal(autoWeb.command, 'web');
  assert.equal(autoWeb.url, 'moyu://read/' + 'a'.repeat(40));
});

test('parseFile rejects missing and unsupported files', () => {
  assert.throws(() => parseFile('/no/such/book.txt'), /文件不存在/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-dispatch-'));
  const file = path.join(dir, 'a.mobi');
  fs.writeFileSync(file, 'x');
  assert.throws(
    () => parseFile(file),
    (error) => error instanceof ParseError && /不支持的格式/.test(error.message)
  );
});
