import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const real = process.argv.includes('--real');
const credential = real ? JSON.parse(readFileSync(0, 'utf8')).credential : randomBytes(32).toString('hex');
const base = process.env.S09_BROWSER_URL || 'http://127.0.0.1:5182';
const out = process.env.S09_EVIDENCE_DIR || '../evidencias/frontend-s09';
const key = 'seminario.reserva.pendiente.v1';
const event = '00000000-0000-0000-0000-000000000001';
const id = '10000000-0000-4000-8000-000000000009';
const createdAt = '2026-10-19T12:34:56Z';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [], contexts = [], logs = [], urls = [];
let stage = 'setup';
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function scenario(mode) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } }); contexts.push(context);
  if (mode === 'cleanup-denied') await context.addInitScript(key => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) { if (name === key) throw Error('denied'); return remove.call(this, name); };
  }, key);
  const page = await context.newPage(); let posts = 0, readsFail = false, responseBody, status, wire;
  page.on('console', message => logs.push(message.text()));
  page.on('pageerror', () => { throw Error('browser-runtime-error'); });
  page.on('request', request => urls.push(request.url()));
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      posts++; wire = { headers: request.headers(), data: request.postDataJSON() };
      const pending = JSON.parse(await page.evaluate(key => sessionStorage.getItem(key), key));
      check(pending.operationKey === wire.headers['idempotency-key'], `${mode}-pending-precedes-post`);
      if (real) {
        const first = await route.fetch(); const original = await first.json();
        check(first.status() === 201, `${mode}-server-created`);
        if (mode === 'repeat') {
          const replay = await context.request.post(`${base}/api/reservas`, wire);
          responseBody = await replay.json(); status = replay.status();
          check(status === 200 && responseBody.id === original.id, 'real-replay-same-uuid');
          await route.fulfill({ response: replay });
        } else { responseBody = original; status = first.status(); await route.fulfill({ response: first }); }
      } else {
        status = mode === 'repeat' ? 200 : 201;
        responseBody = { id, event_id: event, quantity: 2, status: 'confirmed', created_at: createdAt };
        if (mode === 'bad-payload') responseBody.quantity = 3;
        if (mode === 'bad-date') responseBody.created_at = 'invalid';
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(responseBody) });
      }
    } else if (readsFail) await route.fulfill({ status: mode === 'not-found' ? 404 : 503, contentType: 'application/json', body: JSON.stringify({ error: mode === 'not-found' ? 'event_not_found' : 'database_unavailable' }) });
    else if (real) await route.continue();
    else await route.fulfill({ contentType: 'application/json', body: JSON.stringify(path === '/api/catalogo'
      ? { events: [{ id: event, name: 'Seminario de comprobantes', capacity: 25, available: 25 }] } : { id: event, capacity: 25, available: 25 }) });
  });
  await page.goto(base);
  await page.getByLabel('Clave de laboratorio').fill(credential);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
  await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  await page.getByLabel('Cantidad de cupos').fill('2');
  await page.getByRole('button', { name: 'Revisar cantidad' }).click();
  await page.getByRole('button', { name: 'Confirmar cantidad' }).click();
  await page.getByRole('button', { name: 'Enviar reserva', exact: true }).evaluate(button => { button.click(); button.click(); });
  if (mode.startsWith('bad-')) {
    await page.getByRole('region', { name: 'Estado de envío' }).getByText(/No pudimos confirmar/).waitFor();
    check(await page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, `${mode}-no-receipt`);
    check(await page.evaluate(key => sessionStorage.getItem(key) !== null, key), `${mode}-pending-kept`);
  } else {
    const receipt = page.getByRole('region', { name: 'Comprobante de reserva' });
    await receipt.waitFor();
    check((await receipt.innerText()).includes(responseBody.id), `${mode}-uuid-visible`);
    check(await receipt.locator('dd').allTextContents().then(fields => fields[1] === event && fields[2] === '2' && fields[3] === 'Confirmada'), `${mode}-event-quantity-status`);
    check(await receipt.locator('time').getAttribute('datetime') === responseBody.created_at, `${mode}-server-date`);
    check((await receipt.innerText()).includes(status === 201 ? 'Reserva creada' : 'Operación recuperada'), `${mode}-correct-outcome-label`);
    check(await receipt.getByRole('heading').evaluate(node => document.activeElement === node), `${mode}-focus`);
    check(await page.evaluate(key => sessionStorage.getItem(key) === null, key) === (mode !== 'cleanup-denied'), `${mode}-pending-cleanup`);
    if (mode === 'cleanup-denied') check((await receipt.getByRole('alert').innerText()).includes('reserva está confirmada'), 'cleanup-failure-keeps-confirmation');
    readsFail = true;
    await page.getByRole('button', { name: 'Actualizar disponibilidad', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: mode === 'not-found' ? 'Evento no disponible' : 'Disponibilidad desactualizada' }).waitFor();
    check(await receipt.isVisible() && (await receipt.innerText()).includes(responseBody.id), `${mode}-failed-read-keeps-receipt`);
    check(await page.getByRole('button', { name: 'Enviar reserva', exact: true }).count() === 0, `${mode}-no-second-send`);
    if (mode === 'created') for (const [label, width, height] of [['escritorio', 1280, 1100], ['movil', 360, 900]]) {
      await page.setViewportSize({ width, height });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}-no-overflow`);
      await page.screenshot({ path: `${out}/comprobante-${real ? 'real-' : ''}${label}.png`, fullPage: true });
    }
    if (mode === 'repeat' || mode === 'cleanup-denied') await page.screenshot({ path: `${out}/comprobante-${real ? 'real-' : ''}${mode}.png`, fullPage: true });
  }
  check(posts === 1, `${mode}-one-ui-post`);
  const local = await page.evaluate(() => JSON.stringify({ session: Object.entries(sessionStorage), local: Object.entries(localStorage), html: document.body.innerHTML }));
  check(!local.includes(credential), `${mode}-credential-not-persisted`);
}
try {
  await mkdir(out, { recursive: true });
  for (const mode of real ? ['created', 'repeat'] : ['created', 'repeat', 'cleanup-denied', 'not-found', 'bad-payload', 'bad-date']) { stage = mode; await scenario(mode); }
  check(!JSON.stringify({ results, logs, urls }).includes(credential), 'no-secret-in-evidence');
  await writeFile(`${out}/receipt-${real ? 'real' : 'controlled'}.json`, JSON.stringify({ sprint: 'S09', date: new Date().toISOString(), browser: browser.version(), mode: real ? 'exclusive-api-postgresql' : 'controlled', passed: true, checks: results.length, results, credentialsRecorded: false }, null, 2));
  console.log(`S09 ${real ? 'real' : 'controlled'}: ${results.length} checks passed`);
} catch (error) { console.error(`S09 failed at ${stage}: ${error.message.replaceAll(credential, '[redacted]').slice(0, 300)}`); process.exitCode = 1; }
finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
