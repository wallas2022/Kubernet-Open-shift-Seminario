import test from 'node:test';
import assert from 'node:assert/strict';
import { createCredentialStore } from '../src/session/credentialStore.ts';

test('credential is isolated, replaceable and clearable without persistence', () => {
  const first = createCredentialStore();
  const second = createCredentialStore();
  assert.equal(first.read(), null);
  assert.equal(first.replace('synthetic-first'), true);
  assert.equal(second.read(), null);
  assert.equal(first.replace('synthetic-second'), true);
  assert.equal(first.read(), 'synthetic-second');
  first.clear();
  first.clear();
  assert.equal(first.read(), null);
});

test('invalid values do not replace the existing credential', () => {
  const store = createCredentialStore();
  store.replace('synthetic-existing');
  for (const invalid of ['', '   ', 'one\ntwo', 'one\rtwo']) {
    assert.equal(store.replace(invalid), false);
    assert.equal(store.read(), 'synthetic-existing');
  }
});
