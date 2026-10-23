import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_CONFIG,
  configDir,
  loadConfig,
  saveConfig
} from '../src/config.js';
import { bookKey, loadProgress, saveProgress } from '../src/core/store.js';

function withTempConfig(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-cfg-'));
  const old = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = dir;
  try {
    return run(dir);
  } finally {
    process.env.XDG_CONFIG_HOME = old;
  }
}

test('config roundtrip and corrupt recovery', () => {
  withTempConfig(() => {
    saveConfig({ ...DEFAULT_CONFIG, charsPerLine: 88 });
    assert.equal(loadConfig().charsPerLine, 88);

    fs.writeFileSync(path.join(configDir(), 'config.json'), '{bad json');
    assert.equal(loadConfig().charsPerLine, DEFAULT_CONFIG.charsPerLine);
    assert.ok(fs.existsSync(path.join(configDir(), 'config.json.bak')));
  });
});

test('progress roundtrip and corrupt fallback', () => {
  withTempConfig(() => {
    const progress = {
      books: {
        abc: {
          path: '/tmp/a.txt',
          title: 'a',
          offset: 12,
          percent: 3,
          updatedAt: '2026-10-23T00:00:00.000Z'
        }
      }
    };
    saveProgress(progress);
    assert.deepEqual(loadProgress(), progress);

    fs.writeFileSync(path.join(configDir(), 'progress.json'), 'not json');
    assert.deepEqual(loadProgress(), { books: {} });
    assert.ok(fs.existsSync(path.join(configDir(), 'progress.json.bak')));
  });
});

test('bookKey is stable sha1 of realpath', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-key-'));
  const file = path.join(dir, 'a.txt');
  fs.writeFileSync(file, 'x');
  const key = bookKey(file);
  assert.match(key, /^[0-9a-f]{40}$/);
  assert.equal(bookKey(file), key);
});
