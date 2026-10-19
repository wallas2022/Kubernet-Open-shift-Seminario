import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createCreationEngine, credentialFingerprint, parsePending, PENDING_KEY } from '../src/reservation/creationEngine.ts';
const eventId = '00000000-0000-4000-8000-000000000001';
const review = { eventId, quantity: 2 };
const fingerprint = 'a'.repeat(64);
const accepted = { ok: true, status: 201, data: { id: eventId, event_id: eventId, quantity: 2, status: 'confirmed', created_at: new Date().toISOString() } };
function fixture(overrides = {}) {
  const values = new Map(); const calls = []; let generated = 0;
  const credential = randomBytes(32).toString('hex');
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const dependencies = { storage: () => storage, readCredential: () => credential,
    fingerprint: async () => fingerprint, operationKey: () => `intent-${++generated}`,
    post: async intent => { assert.ok(parsePending(values.get(PENDING_KEY))); calls.push(intent); return accepted; }, ...overrides };
  return { engine: createCreationEngine(dependencies), dependencies, values, calls, storage, credential, generated: () => generated };
}
test('S08 synchronous latch blocks clicks before hashing and persists frozen payload before POST', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = fixture({ fingerprint: async () => { await gate; return fingerprint; } });
  const mutable = { ...review }; const sending = f.engine.send(mutable);
  mutable.quantity = 99;
  await f.engine.send(review); assert.equal(f.engine.getSnapshot().phase, 'preparing');
  release(); await sending;
  assert.equal(f.calls.length, 1); assert.equal(f.generated(), 1);
  assert.equal(f.calls[0].quantity, 2); assert.ok(Object.isFrozen(f.calls[0]));
  assert.deepEqual(Object.keys(f.calls[0]).sort(), ['eventId', 'operationKey', 'quantity']);
  await f.engine.send(review); assert.equal(f.calls.length, 1);
  assert.equal(f.engine.getSnapshot().phase, 'accepted');
  assert.equal(f.values.has(PENDING_KEY), false);
});
test('S08 inaccessible storage blocks even initial creation', async () => {
  const f = fixture({ storage: () => { throw Error('denied'); } });
  await f.engine.send(review); assert.equal(f.calls.length, 0); assert.equal(f.generated(), 0);
  assert.equal(f.engine.getSnapshot().phase, 'blocked');
});
test('S08 failed or silently lost write blocks POST', async () => {
  for (const setItem of [() => { throw Error('quota'); }, () => {}]) {
    const f = fixture({ storage: () => ({ getItem: () => null, setItem }) });
    await f.engine.send(review); assert.equal(f.calls.length, 0); assert.equal(f.engine.getSnapshot().phase, 'blocked');
  }
});
test('S08 existing or corrupt record is preserved and never overwritten', async () => {
  const f = fixture({ post: async intent => { f.calls.push(intent); return { ok: false, outcome: 'uncertain' }; } }); await f.engine.send(review);
  for (const raw of [f.values.get(PENDING_KEY), '{broken', JSON.stringify({ ...parsePending(f.values.get(PENDING_KEY)), apiKey: 'forbidden' })]) {
    const storage = { getItem: () => raw, setItem: () => assert.fail('must not overwrite') };
    const engine = createCreationEngine({ ...f.dependencies, storage: () => storage });
    await engine.send(review); assert.equal(engine.getSnapshot().phase, 'blocked');
  }
  assert.equal(f.calls.length, 1);
});
test('S08 pending introduced while hashing blocks creation without generating a key', async () => {
  const f = fixture({ fingerprint: async () => { f.values.set(PENDING_KEY, '{corrupt'); return fingerprint; } });
  await f.engine.send(review); assert.equal(f.generated(), 0); assert.equal(f.calls.length, 0);
});
test('S08 changed or missing credential blocks before POST', async () => {
  let current = 'initial';
  const f = fixture({ readCredential: () => current, fingerprint: async () => { current = 'changed'; return fingerprint; } });
  await f.engine.send(review); assert.equal(f.calls.length, 0); assert.equal(f.values.size, 0);
  const missing = fixture({ readCredential: () => null }); await missing.engine.send(review);
  assert.equal(missing.calls.length, 0);
});
test('S08 invalid quantity or event never persists or posts', async () => {
  for (const value of [{ ...review, quantity: 0 }, { ...review, quantity: true }, { ...review, eventId: 'invalid' }]) {
    const f = fixture(); await f.engine.send(value); assert.equal(f.values.size, 0); assert.equal(f.calls.length, 0);
  }
});
test('S08 timeout and thrown transport keep identical original intention without automatic retry', async () => {
  for (const post of [async () => ({ ok: false, code: 'timeout', outcome: 'uncertain', kind: 'timeout' }), async () => { throw Error('network'); }]) {
    let count = 0;
    const f = fixture({ post: async (...args) => { count++; return post(...args); } });
    await f.engine.send(review); const pending = parsePending(f.values.get(PENDING_KEY));
    assert.equal(pending.state, 'uncertain'); assert.equal(pending.quantity, 2); assert.equal(pending.operationKey, 'intent-1');
    await f.engine.send(review); assert.equal(count, 1); assert.equal(f.engine.getSnapshot().phase, 'uncertain');
    const reloaded = createCreationEngine(f.dependencies); await reloaded.send(review); assert.equal(count, 1);
    assert.equal(reloaded.getSnapshot().phase, 'blocked');
  }
});
test('S08 failed uncertain-state update retains original persisted sending record', async () => {
  const f = fixture({ post: async () => { f.storage.setItem = () => { throw Error('quota'); }; return { ok: false, outcome: 'uncertain' }; } });
  await f.engine.send(review); assert.equal(parsePending(f.values.get(PENDING_KEY)).state, 'sending');
  assert.equal(f.engine.getSnapshot().phase, 'uncertain');
});
test('S08 definitive rejection retains operation and does not resend', async () => {
  let calls = 0; const f = fixture({ post: async () => { calls++; return { ok: false, kind: 'http', outcome: 'rejected', code: 'sold_out', status: 409 }; } });
  await f.engine.send(review); await f.engine.send(review);
  assert.equal(calls, 1); assert.equal(f.engine.getSnapshot().phase, 'rejected'); assert.ok(f.values.has(PENDING_KEY));
});
test('S08 interrupt preserves persisted record and lock', async () => {
  let started; const gate = new Promise(resolve => { started = resolve; });
  const f = fixture({ post: async (_intent, signal) => { started(); return new Promise(resolve => signal.addEventListener('abort', () => resolve({ ok: false, outcome: 'uncertain', code: 'cancelled' }))); } });
  const work = f.engine.send(review); await gate; f.engine.interrupt(); await work;
  assert.equal(f.engine.getSnapshot().phase, 'uncertain'); assert.ok(f.values.has(PENDING_KEY));
});
test('S08 fingerprint is SHA256 without storing the credential', async () => {
  const f = fixture(); const first = await credentialFingerprint(f.credential);
  assert.match(first, /^[a-f0-9]{64}$/); assert.notEqual(first, f.credential);
  assert.equal(first, await credentialFingerprint(f.credential));
});

test('S09 201 and 200 retain the same immutable receipt and remove only validated pending', async () => {
  for (const status of [201, 200]) {
    const data = { ...accepted.data, extra: 'must not persist' };
    const f = fixture({ post: async () => ({ ok: true, status, data }) });
    await f.engine.send(review);
    const state = f.engine.getSnapshot();
    assert.equal(state.receipt.reservation.id, accepted.data.id);
    assert.equal(state.receipt.responseStatus, status);
    assert.equal(state.receipt.pendingCleared, true);
    assert.equal(f.values.size, 0);
    assert.ok(Object.isFrozen(state.receipt.reservation));
    data.quantity = 99;
    assert.equal(state.receipt.reservation.quantity, 2);
    assert.equal('extra' in state.receipt.reservation, false);
    assert.match(state.message, status === 201 ? /creada/ : /recuperada/);
  }
});

test('S09 malformed, mismatched and unexpected successful responses preserve pending without receipt', async () => {
  for (const result of [
    { ...accepted, status: 202 },
    { ...accepted, data: { ...accepted.data, event_id: '00000000-0000-4000-8000-000000000002' } },
    { ...accepted, data: { ...accepted.data, quantity: 3 } },
    { ...accepted, data: { ...accepted.data, id: 'bad' } },
    { ...accepted, data: { ...accepted.data, status: 'pending' } },
    { ...accepted, data: { ...accepted.data, created_at: 'yesterday' } },
  ]) {
    const f = fixture({ post: async () => result }); await f.engine.send(review);
    assert.equal(f.engine.getSnapshot().phase, 'uncertain');
    assert.equal(f.engine.getSnapshot().receipt, undefined);
    assert.ok(f.values.has(PENDING_KEY));
  }
});

test('S09 failed cleanup or replaced record cannot hide confirmation or delete another pending', async () => {
  for (const mode of ['throws', 'ignored', 'replaced']) {
    const f = fixture({ post: async () => {
      if (mode === 'throws') f.storage.removeItem = () => { throw Error('denied'); };
      if (mode === 'ignored') f.storage.removeItem = () => {};
      if (mode === 'replaced') f.values.set(PENDING_KEY, '{another-record');
      return accepted;
    } });
    await f.engine.send(review);
    assert.equal(f.engine.getSnapshot().phase, 'accepted');
    assert.equal(f.engine.getSnapshot().receipt.pendingCleared, false);
    assert.equal(f.engine.getSnapshot().receipt.reservation.id, accepted.data.id);
    assert.ok(f.values.has(PENDING_KEY));
    if (mode === 'replaced') assert.equal(f.values.get(PENDING_KEY), '{another-record');
  }
});
