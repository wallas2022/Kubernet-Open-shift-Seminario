import { chromium } from 'playwright';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const real = process.argv.includes('--real');
const identity = real ? JSON.parse(readFileSync(0, 'utf8')) : { credential: randomBytes(32).toString('hex'), other: randomBytes(32).toString('hex') };
const base = process.env.S11_BROWSER_URL || 'http://127.0.0.1:5184';
const out = process.env.S11_EVIDENCE_DIR || '../evidencias/frontend-s11';
const event = '00000000-0000-0000-0000-000000000001', absent = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const contexts = [], results = [], logs = [], urls = [], runtime = [];
let stage = 'setup', id = randomUUID(), record, uiPosts = 0;
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function open(credential, catalogMode = 'known') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } }); contexts.push(context);
  const page = await context.newPage(); let mode = 'success', lookups = 0, release, delayed;
  page.on('console', message => logs.push(message.text())); page.on('request', request => urls.push(request.url()));
  page.on('pageerror', () => runtime.push('runtime-error'));
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'POST') { uiPosts++; return route.abort('failed'); }
    if (path.startsWith('/api/reservas/')) {
      lookups++;
      check(request.headers()['x-api-key'] === credential && !request.url().includes(credential), `${catalogMode}-lookup-${lookups}-safe-identity-header`);
      if (mode === 'delayed') { delayed?.(); await new Promise(resolve => { release = resolve; }); }
      if (mode === 'unauthorized') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"invalid_credentials"}' });
      if (mode === 'technical') return route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>private backend details</h1>' });
      if (mode === 'bad-response') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...record, id: absent }) });
      if (real) return route.continue();
      if (credential !== identity.credential || path.endsWith(absent)) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"reservation_not_found"}' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(record) }).catch(() => {});
    }
    if (real) return route.continue();
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: catalogMode === 'known'
      ? [{ id: event, name: 'Consulta autorizada del seminario', capacity: 25, available: 23 }] : [] }) });
  });
  await page.goto(base); await page.getByLabel('Clave de laboratorio').fill(credential);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Consultar una reserva' }).click();
  await page.getByRole('heading', { name: 'Consulta una reserva' }).waitFor();
  check(await page.getByLabel('Identificador de reserva', { exact: true }).evaluate(node => document.activeElement === node), `${catalogMode}-input-focus`);
  return { page, context, count: () => lookups, mode: value => { mode = value; },
    startDelay: () => new Promise(resolve => { delayed = resolve; }), release: () => release?.() };
}
async function query(subject, value) {
  await subject.page.getByLabel('Identificador de reserva', { exact: true }).fill(value);
  await subject.page.getByRole('button', { name: 'Consultar reserva', exact: true }).click();
}
try {
  await mkdir(out, { recursive: true });
  if (real) {
    stage = 'seed'; const context = await browser.newContext(); contexts.push(context);
    const response = await context.request.post(`${base}/api/reservas`, { headers: { 'X-Api-Key': identity.credential, 'Idempotency-Key': process.env.S11_FIXTURE_KEY || 's11-lookup-fixture-v1' }, data: { event_id: event, quantity: 2 } });
    check([201, 200].includes(response.status()), 'exclusive-idempotent-fixture-confirmed'); record = await response.json(); id = record.id;
  } else record = { id, event_id: event, quantity: 2, status: 'confirmed', created_at: '2026-10-19T15:00:00Z' };
  stage = 'owner'; const owner = await open(identity.credential);
  for (const invalid of ['', 'invalid', '123', ` ${id}`, `${id} `, `${id}?key=x`, id.replaceAll('-', '')]) {
    await query(owner, invalid); await owner.page.getByRole('alert').getByText(/Introduce el identificador completo/).waitFor();
    check(owner.count() === 0, `invalid-${results.length}-never-sent`);
  }
  const pending = '{unrelated-pending-preserved';
  await owner.page.evaluate(raw => sessionStorage.setItem('seminario.reserva.pendiente.v1', raw), pending);
  await query(owner, id.toUpperCase());
  const receipt = owner.page.getByRole('region', { name: 'Comprobante de reserva' }); await receipt.waitFor();
  check((await receipt.innerText()).includes(id) && (await receipt.innerText()).includes('Confirmada'), 'owner-sees-uuid-and-status');
  check(Date.parse(await receipt.locator('time').getAttribute('datetime')) === Date.parse(record.created_at), 'owner-server-date');
  check(await receipt.getByRole('heading').evaluate(node => document.activeElement === node), 'receipt-focus');
  check((await receipt.innerText()).includes(real ? 'Evento del seminario' : 'Consulta autorizada del seminario'), 'event-name-from-known-catalog');
  check(await owner.page.evaluate(() => sessionStorage.getItem('seminario.reserva.pendiente.v1')) === pending, 'lookup-never-removes-pending');
  for (const [label, width, height] of [['escritorio', 1280, 1100], ['movil', 360, 900]]) {
    await owner.page.setViewportSize({ width, height }); check(await owner.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}-no-overflow`);
    await owner.page.screenshot({ path: `${out}/consulta-${real ? 'real-' : ''}${label}.png`, fullPage: true });
  }
  await query(owner, absent); await owner.page.getByRole('alert').getByText(/No encontramos una reserva accesible/).waitFor();
  const missingMessage = await owner.page.getByRole('alert').innerText();
  check(await receipt.count() === 0, 'missing-clears-previous-receipt');
  stage = 'other-identity'; const other = await open(identity.other);
  await query(other, id); await other.page.getByRole('alert').getByText(/No encontramos una reserva accesible/).waitFor();
  check(await other.page.getByRole('alert').innerText() === missingMessage, 'foreign-and-missing-identical-message');
  check(await other.page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, 'foreign-no-receipt');
  await other.page.screenshot({ path: `${out}/consulta-${real ? 'real-' : ''}ajena.png`, fullPage: true });
  if (real) {
    const foreign = await other.context.request.get(`${base}/api/reservas/${id}`, { headers: { 'X-Api-Key': identity.other } });
    const missing = await owner.context.request.get(`${base}/api/reservas/${absent}`, { headers: { 'X-Api-Key': identity.credential } });
    check(foreign.status() === 404 && missing.status() === 404 && await foreign.text() === await missing.text(), 'real-foreign-and-missing-same-http-response');
  } else {
    stage = 'empty-catalog'; const empty = await open(identity.credential, 'empty'); await query(empty, id);
    const emptyReceipt = empty.page.getByRole('region', { name: 'Comprobante de reserva' }); await emptyReceipt.waitFor();
    check((await emptyReceipt.innerText()).includes(event) && !(await emptyReceipt.innerText()).includes('Evento del catálogo'), 'empty-catalog-id-only-no-invented-name');
    stage = 'technical'; owner.mode('technical'); await query(owner, id);
    await owner.page.getByRole('alert').getByText(/No pudimos consultar/).waitFor();
    check(!(await owner.page.locator('body').innerText()).includes('private backend details'), 'technical-details-hidden');
    owner.mode('bad-response'); await query(owner, id); await owner.page.getByRole('alert').getByText(/No pudimos consultar/).waitFor();
    check(await receipt.count() === 0, 'mismatched-response-no-receipt');
    stage = 'cancel'; owner.mode('delayed'); const started = owner.startDelay(); await query(owner, id); await started;
    const before = owner.count();
    await owner.page.getByRole('button', { name: 'Consultando…', exact: true }).evaluate(button => { button.click(); button.click(); });
    check(owner.count() === before, 'busy-double-click-no-extra-get');
    await owner.page.getByRole('button', { name: 'Volver al catálogo' }).click(); owner.release();
    await owner.page.getByRole('button', { name: 'Consultar una reserva' }).waitFor();
    check(await owner.page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, 'late-result-after-back-not-rendered');
    stage = 'expired'; const expired = await open(identity.credential); expired.mode('unauthorized'); await query(expired, id);
    await expired.page.getByLabel('Clave de laboratorio').waitFor();
    check(await expired.page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, '401-clears-access-and-receipt');
  }
  check(uiPosts === 0, 'query-ui-never-posts'); check(runtime.length === 0, 'no-runtime-errors');
  for (const context of contexts) for (const page of context.pages()) {
    const safe = await page.evaluate(() => JSON.stringify({ html: document.body.innerHTML, local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
    check(!Object.values(identity).some(secret => safe.includes(secret)), `page-${results.length}-credentials-not-persisted`);
  }
  check(!Object.values(identity).some(secret => JSON.stringify({ logs, urls, results }).includes(secret)), 'no-credentials-in-evidence');
  await writeFile(`${out}/lookup-${real ? 'real' : 'controlled'}.json`, JSON.stringify({ sprint: 'S11', date: new Date().toISOString(), mode: real ? 'exclusive-api-postgresql-two-identities' : 'controlled', browser: browser.version(), passed: true, checks: results.length, results, uiPosts, credentialsRecorded: false }, null, 2));
  console.log(`S11 ${real ? 'real' : 'controlled'}: ${results.length} checks passed`);
} catch (error) { console.error(`S11 failed at ${stage}: ${Object.values(identity).reduce((message, secret) => message.replaceAll(secret, '[redacted]'), error.message).slice(0, 300)}`); process.exitCode = 1; }
finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
