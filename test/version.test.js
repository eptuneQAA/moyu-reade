import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERSION } from '../src/version.js';

test('version is defined', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});

test('version matches package.json', () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.equal(VERSION, pkg.version, 'src/version.js 与 package.json 版本不一致');
});
