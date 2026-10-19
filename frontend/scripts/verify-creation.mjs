import { chromium } from 'playwright';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const real = process.argv.includes('--real');
const credential = real ? JSON.parse(readFileSync(0, 'utf8')).credential : randomBytes(32).toString('hex');
const base = process.env.S08_BROWSER_URL || 'http://127.0.0.1:5173';
const out = process.env.S08_EVIDENCE_DIR || '../evidencias/frontend-s08';
const PENDING_KEY = 'seminario.reserva.pendiente.v1';
const eventId = real ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-4000-8000-000000000001';
const expectedFingerprint = createHash('sha256').update(credential).digest('hex');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [], logs = [], urls = [], contexts = [], runtimeErrors = [];
let stage = 'setup', totalPosts = 0, retainedWire, firstResponse, realLostResponse;
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function scenario(mode, seed) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } }); contexts.push(context);
  if (seed) await context.addInitScript(({ key, raw }) => sessionStorage.setItem(key, raw), { key: PENDING_KEY, raw: seed });
  if (mode === 'write-denied') await context.addInitScript(key => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('denied', 'QuotaExceededError'); return set.call(this, name, value); };
  }, PENDING_KEY);
  const page = await context.newPage(); let posts = 0, pendingBeforePost = false, wireSafe = true, wire;
  page.on('console', message => logs.push(message.text()));
  page.on('pageerror', () => runtimeErrors.push('runtime-error'));
  page.on('request', request => urls.push(request.url()));
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      posts++; totalPosts++;
      const pendingRaw = await page.evaluate(key => sessionStorage.getItem(key), PENDING_KEY);
      const pending = JSON.parse(pendingRaw);
      const payload = request.postDataJSON(); wire = { key: request.headers()['idempotency-key'], payload };
      pendingBeforePost = pending.state === 'sending' && pending.operationKey === wire.key
        && pending.eventId === payload.event_id && pending.quantity === payload.quantity;
      wireSafe = request.headers()['x-api-key'] === credential && Object.keys(payload).sort().join(',') === 'event_id,quantity'
        && !request.url().includes(credential) && pending.credentialFingerprint === expectedFingerprint && !pendingRaw.includes(credential);
      if (real) {
        const response = await route.fetch();
        if (mode === 'lost') { realLostResponse = await response.json(); await route.abort('failed'); }
        else { firstResponse = await response.json(); retainedWire = wire; await route.fulfill({ response }); }
      } else if (mode === 'lost') await route.abort('failed');
      else if (mode === 'sold-out') await route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"sold_out"}' });
      else if (mode === 'server-error') await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"database_unavailable"}' });
      else {
        await new Promise(resolve => setTimeout(resolve, 250));
        await route.fulfill({ status: mode === 'repeat' ? 200 : 201, contentType: 'application/json', body: JSON.stringify({
          id: randomUUID(), event_id: mode === 'bad-response' ? randomUUID() : payload.event_id,
          quantity: payload.quantity, status: 'confirmed', created_at: new Date().toISOString(),
        }) });
      }
    } else if (real) await route.continue();
    else await route.fulfill({ contentType: 'application/json', body: JSON.stringify(path === '/api/catalogo'
      ? { events: [{ id: eventId, name: 'Reservas con intención única', capacity: 25, available: 25 }] }
      : { id: eventId, capacity: 25, available: 25 }) });
  });
  async function login() {
    await page.getByLabel('Clave de laboratorio').fill(credential);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
    await page.locator('section[aria-label="Disponibilidad del evento"][aria-busy=false]').waitFor();
    await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  }
  await page.goto(base); await login();
  if (seed) {
    await page.getByRole('region', { name: 'Estado de envío' }).waitFor();
    check(posts === 0 && await page.getByRole('button', { name: 'Enviar reserva', exact: true }).count() === 0, `${mode}-blocks-new-intention`);
    check(await page.evaluate(key => sessionStorage.getItem(key), PENDING_KEY) === seed, `${mode}-preserves-original-record`);
    return { page, context };
  }
  await page.getByLabel('Cantidad de cupos').fill('2');
  await page.getByRole('button', { name: 'Revisar cantidad', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar cantidad', exact: true }).click();
  check(posts === 0, `${mode}-review-and-confirmation-have-no-post`);
  await page.getByRole('button', { name: 'Enviar reserva', exact: true }).evaluate(button => { button.click(); button.click(); });
  const expected = mode === 'write-denied' ? /No se pudo guardar/ : mode === 'sold-out' ? /rechazó la reserva/
    : ['lost', 'bad-response', 'server-error'].includes(mode) ? /No pudimos confirmar el resultado/ : /Reserva creada|Operación recuperada/;
  const accepted = mode === 'success' || mode === 'repeat';
  await page.getByRole('region', { name: accepted ? 'Comprobante de reserva' : 'Estado de envío' }).getByText(expected).waitFor();
  check(posts === (mode === 'write-denied' ? 0 : 1), `${mode}-double-click-at-most-one-post`);
  if (posts) {
    check(pendingBeforePost && wireSafe, `${mode}-verified-pending-before-post-and-safe-headers`);
    check(wire.payload.event_id === eventId && wire.payload.quantity === 2, `${mode}-immutable-reviewed-payload`);
  }
  const pendingRaw = await page.evaluate(key => sessionStorage.getItem(key), PENDING_KEY);
  if (posts) check(accepted ? pendingRaw === null : pendingRaw !== null && JSON.parse(pendingRaw).state === (['lost', 'bad-response', 'server-error'].includes(mode) ? 'uncertain' : 'sending'), `${mode}-pending-lifecycle`);
  check(await page.getByRole('button', { name: 'Enviar reserva', exact: true }).count() === 0, `${mode}-no-second-intention-control`);
  check(await page.getByRole('heading', { name: accepted ? 'Comprobante de reserva' : 'Estado de la operación' }).evaluate(node => document.activeElement === node), `${mode}-state-focus`);
  if (mode === 'success') {
    for (const [name, width, height] of [['escritorio', 1280, 1100], ['movil', 360, 900]]) {
      await page.setViewportSize({ width, height });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}-no-overflow`);
      await page.screenshot({ path: `${out}/pantalla-${real ? 'real-' : ''}${name}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Volver al catálogo' }).click();
    await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
    await page.locator('section[aria-label="Disponibilidad del evento"][aria-busy=false]').waitFor();
    check(await page.getByRole('button', { name: 'Enviar reserva', exact: true }).count() === 0 && posts === 1, 'navigation-does-not-reset-lock');
  }
  if (mode === 'lost') await page.screenshot({ path: `${out}/pantalla-${real ? 'real-' : ''}incierta.png`, fullPage: true });
  const safety = await page.evaluate(() => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage), cookie: document.cookie, html: document.documentElement.outerHTML }));
  check(!safety.includes(credential), `${mode}-credential-not-in-storage-or-page`);
  if (mode !== 'write-denied' && !accepted) {
    await page.reload(); await login();
    await page.getByRole('region', { name: 'Estado de envío' }).getByText(/operación pendiente/).waitFor();
    check(posts === 1, `${mode}-reload-does-not-resend`);
    check(await page.evaluate(key => sessionStorage.getItem(key), PENDING_KEY) === pendingRaw, `${mode}-reload-keeps-key-and-payload`);
  }
  return { page, context, pendingRaw };
}
try {
  await mkdir(out, { recursive: true });
  stage = 'success'; const success = await scenario('success');
  if (real) {
    stage = 'server-idempotency';
    const headers = { 'X-Api-Key': credential, 'Idempotency-Key': retainedWire.key };
    const replays = await Promise.all(Array.from({ length: 20 }, () => success.context.request.post(`${base}/api/reservas`, { headers, data: retainedWire.payload })));
    const bodies = await Promise.all(replays.map(response => response.json()));
    check(replays.every(response => response.status() === 200) && bodies.every(body => body.id === firstResponse.id), 'twenty-concurrent-replays-one-reservation-id');
    const conflict = await success.context.request.post(`${base}/api/reservas`, { headers, data: { ...retainedWire.payload, quantity: 3 } });
    check(conflict.status() === 409 && (await conflict.json()).error === 'idempotency_conflict', 'same-key-different-payload-rejected');
    stage = 'lost-after-commit'; await scenario('lost');
    check(realLostResponse.status === 'confirmed' && realLostResponse.id !== firstResponse.id, 'response-discarded-after-real-confirmation');
    stage = 'concurrent-stock';
    const responses = await Promise.all(Array.from({ length: 40 }, () => success.context.request.post(`${base}/api/reservas`, {
      headers: { 'X-Api-Key': credential, 'Idempotency-Key': randomUUID() }, data: { event_id: eventId, quantity: 1 },
    })));
    const created = responses.filter(response => response.status() === 201).length;
    const soldOut = responses.filter(response => response.status() === 409).length;
    check(created === 21 && soldOut === 19, 'forty-concurrent-requests-respect-remaining-twenty-one-seats');
    check((await success.context.request.get(`${base}/api/eventos/${eventId}/disponibilidad`, { headers: { 'X-Api-Key': credential } }).then(response => response.json())).available === 0, 'real-inventory-never-negative');
  } else {
    for (const mode of ['repeat', 'write-denied', 'sold-out', 'lost', 'bad-response', 'server-error']) { stage = mode; await scenario(mode); }
    const seededPending = JSON.stringify({ version: 1, eventId, quantity: 2, operationKey: randomUUID(), credentialFingerprint: expectedFingerprint, startedAt: new Date().toISOString(), state: 'uncertain' });
    stage = 'existing-record'; await scenario('existing-record', seededPending);
    stage = 'corrupt-record'; await scenario('corrupt-record', '{broken');
  }
  check(runtimeErrors.length === 0, 'no-browser-runtime-errors');
  check(!JSON.stringify({ logs, urls, results }).includes(credential), 'no-credential-in-browser-logs-urls-or-report');
  await writeFile(`${out}/${real ? 'creation-real' : 'creation-controlled'}.json`, JSON.stringify({ sprint: 'S08', date: new Date().toISOString(),
    mode: real ? 'exclusive-postgresql-api' : 'intercepted-responses', browser: browser.version(), passed: true,
    checks: results.length, results, uiPosts: totalPosts, credentialsRecorded: false,
    ...(real ? { serverReplayRequests: 20, conflictRequests: 1, stockRaceRequests: 40, expectedReservations: 23, expectedReservedQuantity: 25 } : {}),
  }, null, 2));
  console.log(`S08 ${real ? 'exclusive real API' : 'controlled'}: ${results.length} checks passed; credentials omitted.`);
} catch (error) {
  for (const context of contexts) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/fallo-${real ? 'real' : 'controlled'}.png`, fullPage: true }).catch(() => {});
  }
  console.error(`S08 verification failed at ${stage}: ${error.message.replaceAll(credential, '[redacted]').slice(0, 240)}`); process.exitCode = 1;
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
