import test from 'node:test';
import assert from 'node:assert/strict';
import { protocolPath } from '../src/web/protocol.js';

const id = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

test('moyu://shelf opens the library', () => {
  assert.equal(protocolPath('moyu://shelf'), '/');
  assert.equal(protocolPath('moyu://library'), '/');
  assert.equal(protocolPath('moyu://'), '/');
});

test('moyu://read/<id> opens the reader', () => {
  assert.equal(protocolPath(`moyu://read/${id}`), `/#/read/${id}`);
  assert.equal(protocolPath(`moyu://book/${id.toUpperCase()}`), `/#/read/${id}`);
  assert.equal(protocolPath(`moyu:///read/${id}`), `/#/read/${id}`);
});

test('invalid protocol targets fall back to the library', () => {
  assert.equal(protocolPath('moyu://read/not-a-book'), '/');
  assert.equal(protocolPath('https://example.com'), '/');
  assert.equal(protocolPath('not a url'), '/');
});
