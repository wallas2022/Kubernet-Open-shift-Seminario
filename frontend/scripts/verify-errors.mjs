import { chromium } from 'playwright';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const real = process.argv.includes('--real');
const identity = real ? JSON.parse(readFileSync(0, 'utf8')) : { credential: randomBytes(32).toString('hex'), other: randomBytes(32).toString('hex') };
const base = process.env.S12_BROWSER_URL || 'http://127.0.0.1:5185';
const out = process.env.S12_EVIDENCE_DIR || '../evidencias/frontend-s12';
const selected = process.env.S12_SCENARIOS?.split(',');
const event = '00000000-0000-0000-0000-000000000001', pendingKey = 'seminario.reserva.pendiente.v1';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const contexts = [], results = [], logs = [], urls = [], runtime = [];
let stage = 'setup', winner;
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function pageFor(credential, mode) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } }); contexts.push(context);
  const page = await context.newPage(); let posts = 0, catalogReads = 0, availabilityReads = 0, wire;
  page.on('console', message => logs.push(message.text())); page.on('request', request => urls.push(request.url()));
  page.on('pageerror', () => runtime.push('runtime-error'));
  page.on('response', response => { if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/api/')) logs.push(`asset:${response.status()}:${new URL(response.url()).pathname}`); });
  page.on('requestfailed', request => { if (!new URL(request.url()).pathname.startsWith('/api/')) logs.push(`asset-failed:${new URL(request.url()).pathname}`); });
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      posts++; wire = { key: request.headers()['idempotency-key'], data: request.postDataJSON() };
      if (real) { const response = await route.fetch(); if (response.status() === 201) winner = { context, credential, wire, body: await response.json() }; return route.fulfill({ response }); }
      if (mode === 'network') return route.abort('failed');
      if (mode === 'timeout') { await new Promise(resolve => setTimeout(resolve, 16000)); return route.fulfill({ status: 503, body: '' }).catch(() => {}); }
      const failures = { sold: [409, { error: 'sold_out' }], conflict: [409, { error: 'idempotency_conflict' }], invalid: [422, { detail: [{ msg: 'private SQL trace' }] }], deleted: [404, { error: 'event_not_found' }], post401: [401, { error: 'invalid_credentials' }], unavailable: [503, { error: 'database_unavailable' }], retry: [503, { error: 'retry_later' }] };
      if (failures[mode]) { const [status, body] = failures[mode]; return route.fulfill({ status, contentType: 'application/json', headers: { 'Retry-After': '3' }, body: JSON.stringify(body) }); }
      if (mode === 'html') return route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>private SQL trace</h1>' });
      if (mode === 'empty') return route.fulfill({ status: 502, body: '' });
      return route.fulfill({ status: 201, contentType: 'application/json', body: mode === 'malformed' ? '{broken' : JSON.stringify({ id: randomUUID(), event_id: event, quantity: 1, status: 'confirmed', created_at: '2026-10-19T12:00:00Z' }) });
    }
    if (real) return route.continue();
    if (path === '/api/catalogo') {
      catalogReads++;
      if (mode === 'login401' || mode === 'catalog401' && catalogReads > 1) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"invalid_credentials"}' });
      if (mode === 'login-html' || mode === 'catalog-stale' && catalogReads > 2) return route.fulfill({ status: 503, contentType: 'text/html', body: 'private SQL trace' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [{ id: event, name: 'Mensajes de reservas', capacity: 1, available: 1 }] }) });
    }
    availabilityReads++;
    if (mode === 'availability404') return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"event_not_found"}' });
    if (mode === 'availability401') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"invalid_credentials"}' });
    if (mode === 'receipt-read-failure' && availabilityReads > 1) return route.fulfill({ status: 503, contentType: 'text/html', body: 'private SQL trace' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: event, capacity: 1, available: mode === 'zero' ? 0 : 1 }) });
  });
  await page.goto(base); await page.getByLabel('Clave de laboratorio').fill(credential); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  return { page, context, posts: () => posts, wire: () => wire };
}
async function prepare(subject) {
  const { page } = subject;
  await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
  await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar cantidad' }).click(); await page.getByRole('button', { name: 'Confirmar cantidad' }).click();
}
async function controlled(mode) {
  const subject = await pageFor(identity.credential, mode), { page } = subject;
  if (mode === 'login401' || mode === 'login-html') {
    await page.getByRole('alert').getByText(mode === 'login401' ? /La clave no es válida/ : /No pudimos comprobar el acceso/).waitFor();
  } else if (mode === 'catalog401') await page.getByRole('alert').getByText(/El acceso ya no está autorizado/).waitFor();
  else if (mode === 'catalog-stale') {
    await page.locator('.event-card').waitFor(); await page.getByRole('button', { name: 'Actualizar catálogo' }).click();
    await page.getByRole('alert').getByText('Información desactualizada.').waitFor();
    check((await page.locator('.event-card').innerText()).includes('Mensajes de reservas'), 'catalog-stale-keeps-data');
  } else if (['availability404', 'availability401', 'zero'].includes(mode)) {
    await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
    if (mode === 'availability401') await page.getByRole('alert').getByText(/El acceso ya no está autorizado/).waitFor();
    else if (mode === 'availability404') await page.getByRole('alert').getByText('Evento no disponible.').waitFor();
    else { await page.getByText('Sin cupos disponibles en esta lectura.').waitFor(); check(await page.getByRole('button', { name: 'Reservar', exact: true }).isDisabled(), 'zero-blocks-reserve'); }
  } else {
    await prepare(subject); await page.getByRole('button', { name: 'Enviar reserva', exact: true }).evaluate(button => { button.click(); button.click(); });
    if (mode === 'receipt-read-failure') {
      const receipt = page.getByRole('region', { name: 'Comprobante de reserva' }); await receipt.waitFor(); const uuid = await receipt.locator('dd').first().innerText();
      await page.getByRole('button', { name: 'Actualizar disponibilidad' }).click(); await page.getByText('Disponibilidad desactualizada.').waitFor();
      check(await receipt.isVisible() && (await receipt.innerText()).includes(uuid), 'failed-read-retains-confirmation');
    } else if (mode === 'post401') {
      await page.getByRole('alert').getByText(/El acceso ya no está autorizado/).waitFor();
      check(await page.getByLabel('Clave de laboratorio').isVisible(), 'post401-returns-to-login');
    } else {
      const patterns = { sold: /La API rechazó la reserva por falta de cupos/, conflict: /asociada a datos diferentes/, invalid: /rechazó los datos/, deleted: /evento ya no está disponible/, timeout: /Se agotó el tiempo de espera/, unavailable: /servicio no está disponible temporalmente/, retry: /Espera al menos 3 segundos/, malformed: /respuesta no pudo validarse/ };
      await page.getByRole('region', { name: 'Estado de envío' }).getByText(patterns[mode] || /No pudimos confirmar el resultado/).waitFor();
      check(await page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, `${mode}-no-false-confirmation`);
    }
    check(subject.posts() === 1, `${mode}-one-post-no-automatic-retry`);
    if (mode !== 'receipt-read-failure') check(await page.evaluate(key => sessionStorage.getItem(key) !== null, pendingKey), `${mode}-pending-preserved`);
  }
  const visible = await page.locator('body').innerText(); check(!visible.includes('private SQL trace'), `${mode}-no-private-detail`);
  if (['conflict', 'unavailable', 'post401', 'receipt-read-failure'].includes(mode)) await page.screenshot({ path: `${out}/mensaje-${mode}.png`, fullPage: true });
  const safe = await page.evaluate(() => JSON.stringify({ html: document.body.innerHTML, local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
  check(!Object.values(identity).some(secret => safe.includes(secret)), `${mode}-no-persisted-credential`);
  await subject.context.close();
}
try {
  await mkdir(out, { recursive: true });
  if (real) {
    stage = 'last-seat'; const a = await pageFor(identity.credential, 'real'), b = await pageFor(identity.other, 'real');
    await Promise.all([prepare(a), prepare(b)]);
    await Promise.all([a.page.getByRole('button', { name: 'Enviar reserva', exact: true }).click(), b.page.getByRole('button', { name: 'Enviar reserva', exact: true }).click()]);
    await Promise.all([a.page.getByText(/Reserva creada y confirmada|La API rechazó la reserva por falta de cupos/).waitFor(), b.page.getByText(/Reserva creada y confirmada|La API rechazó la reserva por falta de cupos/).waitFor()]);
    check(a.posts() === 1 && b.posts() === 1, 'two-identities-one-attempt-each');
    check(await a.page.getByRole('region', { name: 'Comprobante de reserva' }).count() + await b.page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 1, 'last-seat-one-confirmation');
    check(Number((await a.page.locator('body').innerText()).includes('falta de cupos')) + Number((await b.page.locator('body').innerText()).includes('falta de cupos')) === 1, 'last-seat-one-sold-out-message');
    const headers = { 'X-Api-Key': winner.credential, 'Idempotency-Key': winner.wire.key };
    const conflict = await winner.context.request.post(`${base}/api/reservas`, { headers, data: { event_id: event, quantity: 2 } });
    check(conflict.status() === 409 && (await conflict.json()).error === 'idempotency_conflict', 'real-api-conflict-contract');
    const invalid = await winner.context.request.post(`${base}/api/reservas`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { event_id: event, quantity: 0 } });
    check(invalid.status() === 422, 'real-api-validation-contract');
    const unauth = await winner.context.request.get(`${base}/api/catalogo`, { headers: { 'X-Api-Key': randomBytes(32).toString('hex') } }); check(unauth.status() === 401, 'real-api-unauthorized-contract');
    await a.page.screenshot({ path: `${out}/competencia-cliente-a.png`, fullPage: true }); await b.page.screenshot({ path: `${out}/competencia-cliente-b.png`, fullPage: true });
  } else for (const mode of selected || ['login401', 'login-html', 'catalog401', 'catalog-stale', 'availability404', 'availability401', 'zero', 'sold', 'conflict', 'invalid', 'deleted', 'post401', 'unavailable', 'retry', 'html', 'empty', 'malformed', 'network', 'timeout', 'receipt-read-failure']) { stage = mode; await controlled(mode); }
  for (const context of contexts) for (const page of context.pages()) {
    const data = await page.evaluate(() => JSON.stringify({ html: document.body.innerHTML, local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
    check(!Object.values(identity).some(secret => data.includes(secret)), `page-${results.length}-no-persisted-credential`);
  }
  check(runtime.length === 0, 'no-runtime-errors'); check(!Object.values(identity).some(secret => JSON.stringify({ logs, urls, results }).includes(secret)), 'no-secret-in-evidence');
  await writeFile(`${out}/errors-${real ? 'real' : selected ? 'selected' : 'controlled'}.json`, JSON.stringify({ sprint: 'S12', date: new Date().toISOString(), mode: real ? 'exclusive-postgresql-last-seat-race' : 'controlled-error-matrix', browser: browser.version(), passed: true, checks: results.length, results, credentialsRecorded: false }, null, 2));
  console.log(`S12 ${real ? 'real' : 'controlled'}: ${results.length} checks passed`);
} catch (error) {
  for (const context of contexts) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/fallo-${real ? 'real' : 'controlled'}.png`, fullPage: true }).catch(() => {});
  }
  console.error(`S12 failed at ${stage}: ${Object.values(identity).reduce((message, secret) => message.replaceAll(secret, '[redacted]'), error.message).slice(0, 300)}`); process.exitCode = 1;
}
finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
