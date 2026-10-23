import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustValue, SETTINGS } from '../src/core/settings.js';

const BASE = {
  theme: 'paper',
  charsPerLine: 100,
  linesPerPage: 0,
  autoPageSeconds: 30
};

test('settings expose theme and the three density options', () => {
  assert.deepEqual(
    SETTINGS.map((setting) => setting.key),
    ['theme', 'charsPerLine', 'linesPerPage', 'autoPageSeconds']
  );
});

test('theme cycles through paper, night and opencode', () => {
  assert.equal(adjustValue(BASE, 'theme', 1), 'night');
  assert.equal(adjustValue({ ...BASE, theme: 'night' }, 'theme', 1), 'opencode');
  assert.equal(
    adjustValue({ ...BASE, theme: 'opencode' }, 'theme', 1),
    'paper'
  );
  assert.equal(adjustValue(BASE, 'theme', -1), 'opencode');
});

test('charsPerLine clamps to 40..120', () => {
  assert.equal(adjustValue({ ...BASE, charsPerLine: 40 }, 'charsPerLine', -1), 40);
  assert.equal(adjustValue({ ...BASE, charsPerLine: 120 }, 'charsPerLine', 1), 120);
  assert.equal(adjustValue(BASE, 'charsPerLine', 1), 110);
});

test('linesPerPage toggles auto mode and clamps', () => {
  assert.equal(adjustValue(BASE, 'linesPerPage', 1, 20), 20);
  assert.equal(adjustValue(BASE, 'linesPerPage', -1, 20), 0);
  assert.equal(adjustValue({ ...BASE, linesPerPage: 20 }, 'linesPerPage', -1, 20), 19);
  assert.equal(adjustValue({ ...BASE, linesPerPage: 10 }, 'linesPerPage', -1, 20), 0);
  assert.equal(adjustValue({ ...BASE, linesPerPage: 60 }, 'linesPerPage', 1, 20), 60);
});

test('autoPageSeconds clamps to 5..120', () => {
  assert.equal(adjustValue({ ...BASE, autoPageSeconds: 5 }, 'autoPageSeconds', -1), 5);
  assert.equal(adjustValue({ ...BASE, autoPageSeconds: 120 }, 'autoPageSeconds', 1), 120);
});
