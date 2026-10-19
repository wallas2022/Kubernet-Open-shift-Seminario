import test from 'node:test';
import assert from 'node:assert/strict';
import { creationFailureMessage, readFailureMessage } from '../src/api/messages.ts';
import { createCreationEngine, PENDING_KEY } from '../src/reservation/creationEngine.ts';

test('S12 uncertain outcomes never claim rejection and retain explicit recovery guidance', () => {
  for (const code of ['timeout', 'network_error', 'unexpected_response', 'database_unavailable', 'retry_later', 'http_error']) {
    const text = creationFailureMessage({ ok: false, kind: 'http', outcome: 'uncertain', code, status: 503, detail: 'private SQL trace' });
    assert.match(text, /podría haberse creado/); assert.match(text, /misma clave/);
    assert.doesNotMatch(text, /rechazó|private|SQL|trace/);
  }
});

test('S12 domain rejections distinguish stock, identity, conflict, event and invalid data', () => {
  const patterns = { sold_out: /falta de cupos/, invalid_credentials: /clave no permite/, event_not_found: /evento ya no está disponible/,
    idempotency_conflict: /datos diferentes/, validation_error: /rechazó los datos/ };
  for (const [code, pattern] of Object.entries(patterns)) {
    const text = creationFailureMessage({ outcome: 'rejected', code, status: code === 'invalid_credentials' ? 401 : 409 });
    assert.match(text, pattern); assert.match(text, /Conservamos el registro/); assert.match(text, /No hay reintento automático/);
  }
});

test('S12 read privacy and Retry-After guidance never reflect untrusted detail', () => {
  const absent = { status: 404, code: 'reservation_not_found', outcome: 'read-failed' };
  assert.equal(readFailureMessage(absent, 'reservation'), 'No encontramos una reserva accesible con ese identificador.');
  assert.match(readFailureMessage({ code: 'timeout' }, 'catalog'), /tiempo de espera/);
  assert.match(readFailureMessage({ code: 'unexpected_response' }, 'availability'), /no pudo validarse/);
  for (const seconds of [NaN, -2, 1e12, 'private-data']) assert.doesNotMatch(creationFailureMessage({ outcome: 'uncertain', retryAfterSeconds: seconds }), /Espera al menos|private-data/);
  assert.match(creationFailureMessage({ outcome: 'uncertain', status: 503, retryAfterSeconds: 3 }), /Espera al menos 3 segundos/);
});

test('S12 unauthorized POST preserves intention before notifying session expiration', async () => {
  const values = new Map(); let expired = 0;
  const engine = createCreationEngine({ storage: () => ({ getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }),
    readCredential: () => 'in-memory-only', fingerprint: async () => 'a'.repeat(64), operationKey: () => 'original-intent',
    post: async () => ({ ok: false, kind: 'http', outcome: 'rejected', status: 401, code: 'invalid_credentials' }),
    onUnauthorized: () => { assert.ok(values.has(PENDING_KEY)); expired++; } });
  await engine.send({ eventId: '00000000-0000-0000-0000-000000000001', quantity: 1 });
  assert.equal(expired, 1); assert.equal(engine.getSnapshot().recovery, true);
  await engine.send({ eventId: '00000000-0000-0000-0000-000000000001', quantity: 2 });
  assert.equal(expired, 1); assert.equal(JSON.parse(values.get(PENDING_KEY)).quantity, 1);
});
