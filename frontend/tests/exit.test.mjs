import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreationEngine, PENDING_KEY } from '../src/reservation/creationEngine.ts';
const eventId = '00000000-0000-4000-8000-000000000001';
function fixture(overrides = {}) {
  const values = new Map(); let posts = 0;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const engine = createCreationEngine({ storage: () => storage, readCredential: () => 'synthetic', fingerprint: async () => 'a'.repeat(64), operationKey: () => 'exit-test',
    post: async () => { posts++; return { ok: false, outcome: 'uncertain', kind: 'network', code: 'network_error' }; }, ...overrides });
  return { engine, values, posts: () => posts };
}
test('S13 exit clears pending fingerprint and state and permanently disables old engine', async () => {
  const f = fixture(); assert.equal(f.engine.needsExitWarning(), false);
  await f.engine.send({ eventId, quantity: 1 }); assert.equal(f.engine.needsExitWarning(), true);
  assert.ok(f.values.get(PENDING_KEY).includes('credentialFingerprint'));
  assert.equal(f.engine.close(), true); assert.equal(f.values.size, 0);
  assert.deepEqual(f.engine.getSnapshot(), { phase: 'idle', message: '', pending: undefined, recovery: false });
  await f.engine.send({ eventId, quantity: 1 }); await f.engine.recover(); assert.equal(f.posts(), 1);
});
test('S13 exit while hashing cannot recreate pending or POST', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = fixture({ fingerprint: async () => { await gate; return 'a'.repeat(64); } });
  const sending = f.engine.send({ eventId, quantity: 1 }); assert.equal(f.engine.needsExitWarning(), true);
  assert.equal(f.engine.close(), true); release(); await sending;
  assert.equal(f.values.size, 0); assert.equal(f.posts(), 0); assert.equal(f.engine.getSnapshot().phase, 'idle');
});
test('S13 late POST response cannot recreate pending receipt or unauthorized notice', async () => {
  for (const ok of [true, false]) {
    let resolvePost, signal, unauthorized = 0;
    const gate = new Promise(resolve => { resolvePost = resolve; });
    const f = fixture({ post: async (_, abortSignal) => { signal = abortSignal; return gate; }, onUnauthorized: () => unauthorized++ });
    const sending = f.engine.send({ eventId, quantity: 1 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.engine.close(), true); assert.equal(signal.aborted, true);
    resolvePost(ok ? { ok: true, status: 201, data: { id: eventId, event_id: eventId, quantity: 1, status: 'confirmed', created_at: new Date().toISOString() } }
      : { ok: false, status: 401, outcome: 'uncertain', code: 'invalid_credentials' });
    await sending; assert.equal(f.values.size, 0); assert.equal(f.engine.getSnapshot().receipt, undefined); assert.equal(unauthorized, 0);
  }
});
test('S13 corrupt pending warns and clears only the app record', () => {
  const f = fixture(); f.values.set(PENDING_KEY, '{broken'); f.values.set('unrelated', 'retained');
  assert.equal(f.engine.needsExitWarning(), true); assert.equal(f.engine.close(), true);
  assert.equal(f.values.get('unrelated'), 'retained');
});
test('S13 denied or silently failed deletion never reports completed cleanup', () => {
  for (const storage of [() => { throw Error('denied'); }, () => ({ getItem: () => '{broken', removeItem() {} })]) {
    const f = fixture({ storage }); assert.equal(f.engine.needsExitWarning(), true); assert.equal(f.engine.close(), false);
    assert.equal(f.engine.getSnapshot().receipt, undefined);
  }
});
