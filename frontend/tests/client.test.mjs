import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createApiClient } from '../src/api/client.ts';

const eventId = '00000000-0000-4000-8000-000000000001';
const reservationId = '00000000-0000-4000-8000-000000000002';
const intent = { operationKey: 'controlled-test-operation', eventId, quantity: 2 };
const reservation = { id: reservationId, event_id: eventId, quantity: 2, status: 'confirmed', created_at: '2026-10-17T12:00:00+00:00' };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const client = (fetcher, options = {}) => createApiClient({ readCredential: () => 'synthetic-only', fetcher, ...options });

test('GET uses headers and same-origin protections; current credential is read for each call', async () => {
  let credential = randomBytes(24).toString('hex');
  const seen = [];
  const transport = createApiClient({ readCredential: () => credential, fetcher: async (path, options) => {
    seen.push({ path, options });
    return json({ events: [] });
  } });
  const first = await transport.catalog();
  assert.deepEqual(first, { ok: true, status: 200, data: { events: [] } });
  assert.equal(seen[0].options.headers['X-Api-Key'], credential);
  credential = randomBytes(24).toString('hex');
  await transport.catalog();
  assert.equal(seen[1].options.headers['X-Api-Key'], credential);
  for (const { path, options } of seen) {
    assert.equal(path, '/api/catalogo');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.mode, 'same-origin');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.body, undefined);
  }
  credential = null;
  assert.equal((await transport.catalog()).outcome, 'not-sent');
  assert.equal(seen.length, 2);
});

test('invalid paths, payloads, idempotency keys and header values are never sent', async () => {
  let calls = 0;
  const transport = client(async () => { calls++; return json({}); });
  for (const id of ['https://outside.test/key', '../secret', `${eventId}?key=value`]) {
    assert.equal((await transport.availability(id)).outcome, 'not-sent');
    assert.equal((await transport.reservation(id)).outcome, 'not-sent');
  }
  for (const quantity of [0, 101, 1.5, true, '2']) assert.equal((await transport.createReservation({ ...intent, quantity })).outcome, 'not-sent');
  for (const operationKey of ['', 'bad\r\nheader', 'bad key', 'x'.repeat(129)]) assert.equal((await transport.createReservation({ ...intent, operationKey })).outcome, 'not-sent');
  for (const value of ['', ' space', 'trailing ', 'line\nbreak', 'non-byte-🔑']) {
    const result = await client(async () => { calls++; }, { readCredential: () => value }).catalog();
    assert.equal(result.outcome, 'not-sent');
    assert.ok(!JSON.stringify(result).includes(value) || value === '');
  }
  assert.equal(calls, 0);
});

test('known errors normalize error and detail without leaking arbitrary text', async () => {
  for (const [status, body, code, outcome] of [
    [401, { detail: 'invalid_credentials' }, 'invalid_credentials', 'rejected'],
    [404, { error: 'event_not_found' }, 'event_not_found', 'rejected'],
    [409, { error: 'sold_out' }, 'sold_out', 'rejected'],
    [409, { error: 'idempotency_conflict' }, 'idempotency_conflict', 'rejected'],
    [422, { detail: [{ msg: 'private validation input', input: 'private value' }] }, 'validation_error', 'rejected'],
    [503, { error: 'database_unavailable' }, 'database_unavailable', 'uncertain'],
    [503, { error: 'retry_later' }, 'retry_later', 'uncertain'],
    [500, { error: 'sold_out' }, 'http_error', 'uncertain'],
    [400, { detail: 'private server exception' }, 'http_error', 'uncertain'],
  ]) {
    const transport = client(async () => json(body, status));
    const result = await transport.createReservation(intent);
    assert.equal(result.code, code);
    assert.equal(result.outcome, outcome);
    assert.equal(result.status, status);
    assert.ok(!JSON.stringify(result).includes('private'));
    assert.equal((await transport.catalog()).outcome, 'read-failed');
  }
});

test('HTML, empty, malformed JSON and unexpected success status remain conservative', async () => {
  for (const makeResponse of [
    () => new Response('<html>private proxy error</html>', { headers: { 'Content-Type': 'text/html' } }),
    () => new Response('', { headers: { 'Content-Type': 'application/json' } }),
    () => new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
    () => new Response(null, { status: 204 }),
    () => json(reservation, 202),
  ]) {
    const transport = client(async () => makeResponse());
    const result = await transport.createReservation(intent);
    assert.equal(result.kind, 'protocol');
    assert.equal(result.outcome, 'uncertain');
    assert.ok(!JSON.stringify(result).includes('private'));
    assert.equal((await transport.catalog()).outcome, 'read-failed');
  }
  const error = await client(async () => new Response('<html>private</html>', { status: 502 })).createReservation(intent);
  assert.equal(error.outcome, 'uncertain');
  assert.equal(error.code, 'http_error');
});

test('runtime schema checks reject wrong resources, impossible inventory and mismatched confirmation', async () => {
  for (const body of [{}, { events: null }, { events: [{ id: eventId, name: 'Event', capacity: 1, available: 2 }] },
    { events: [{ id: eventId, name: 'Event', capacity: 2, available: true }] }]) {
    assert.equal((await client(async () => json(body)).catalog()).kind, 'protocol');
  }
  assert.equal((await client(async () => json({ id: reservationId, capacity: 10, available: 5 })).availability(eventId)).kind, 'protocol');
  for (const body of [{ ...reservation, quantity: 3 }, { ...reservation, event_id: reservationId },
    { ...reservation, created_at: 'not-a-date' }, { ...reservation, status: 'cancelled' }]) {
    assert.equal((await client(async () => json(body)).createReservation(intent)).outcome, 'uncertain');
  }
  assert.equal((await client(async () => json(reservation)).reservation(eventId)).kind, 'protocol');
});

test('valid catalog, availability and authorized lookup return only contract fields', async () => {
  const stock = { id: eventId, capacity: 10, available: 7 };
  const event = { ...stock, name: 'Evento de prueba' };
  assert.deepEqual(await client(async () => json({ events: [{ ...event, ignored: true }] })).catalog(),
    { ok: true, status: 200, data: { events: [event] } });
  assert.deepEqual(await client(async () => json(stock)).availability(eventId), { ok: true, status: 200, data: stock });
  assert.deepEqual(await client(async () => json(reservation)).reservation(reservationId), { ok: true, status: 200, data: reservation });
});

test('201 and 200 confirmations preserve status and omit unexpected response fields', async () => {
  for (const status of [201, 200]) {
    let calls = 0;
    const result = await client(async (path, options) => {
      calls++;
      assert.equal(path, '/api/reservas');
      assert.equal(options.headers['Idempotency-Key'], intent.operationKey);
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(options.body), { event_id: eventId, quantity: 2 });
      return json({ ...reservation, unexpected: 'private' }, status);
    }).createReservation(intent);
    assert.deepEqual(result, { ok: true, status, data: reservation });
    assert.equal(calls, 1);
  }
});

test('timeout includes response body reading and never repeats POST', async () => {
  for (const phase of ['headers', 'body']) {
    let calls = 0;
    const transport = client(async (_path, options) => {
      calls++;
      if (phase === 'headers') return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('private failure'))));
      return new Response(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'application/json' } });
    }, { timeoutMs: 20 });
    const result = await transport.createReservation(intent);
    assert.equal(result.kind, 'timeout');
    assert.equal(result.outcome, 'uncertain');
    assert.equal(calls, 1);
  }
  const read = await client(async () => new Promise(() => {}), { timeoutMs: 20 }).catalog();
  assert.equal(read.kind, 'timeout');
  assert.equal(read.outcome, 'read-failed');
});

test('abort before sending differs from cancellation after dispatch', async () => {
  let calls = 0;
  const before = new AbortController();
  before.abort();
  assert.equal((await client(async () => { calls++; }).createReservation(intent, { signal: before.signal })).outcome, 'not-sent');
  assert.equal(calls, 0);
  const during = new AbortController();
  const transport = client(async (_path, options) => {
    calls++;
    during.abort();
    assert.equal(options.signal.aborted, true);
    throw new Error('private error');
  });
  const result = await transport.createReservation(intent, { signal: during.signal });
  assert.equal(result.kind, 'cancelled');
  assert.equal(result.outcome, 'uncertain');
  assert.equal(calls, 1);
});

test('Retry-After is guidance only and a 503 never proves rejection', async () => {
  for (const header of ['3', new Date(Date.now() + 60_000).toUTCString(), 'invalid-private-value']) {
    let calls = 0;
    const result = await client(async () => { calls++; return json({ error: 'retry_later' }, 503, { 'Retry-After': header }); }).createReservation(intent);
    assert.equal(result.outcome, 'uncertain');
    assert.equal(calls, 1);
    if (header === '3') assert.equal(result.retryAfterSeconds, 3);
    else if (header.startsWith('invalid')) assert.equal(result.retryAfterSeconds, undefined);
    else assert.ok(result.retryAfterSeconds > 0 && result.retryAfterSeconds <= 60);
  }
});

test('network errors are sanitized and an explicit POST makes only one fetch', async () => {
  let calls = 0;
  const secret = randomBytes(24).toString('hex');
  const transport = client(async () => { calls++; throw new Error(secret); });
  const result = await transport.createReservation(intent);
  assert.deepEqual(result, { ok: false, kind: 'network', outcome: 'uncertain', code: 'network_error' });
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.equal(calls, 1);
});

test('local HTTP fixture simulates a lost response after an effect without claiming database validation', async () => {
  let effects = 0;
  let requests = 0;
  const server = createServer((request, response) => {
    requests++;
    if (request.method === 'POST') {
      effects++;
      request.resume();
      request.on('end', () => request.socket.destroy());
    } else { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ events: [] })); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    const transport = client((path, options) => fetch(`http://127.0.0.1:${address.port}${path}`, options));
    assert.equal((await transport.catalog()).ok, true);
    const result = await transport.createReservation(intent);
    assert.equal(result.outcome, 'uncertain');
    assert.equal(effects, 1);
    assert.equal(requests, 2);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
