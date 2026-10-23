import test from 'node:test';
import assert from 'node:assert/strict';
import { VERSION } from '../src/version.js';

test('version is defined', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
