import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const real = process.argv.includes('--real');
const supplied = real ? JSON.parse(readFileSync(0, 'utf8')) : null;
const base = process.env.S05_BROWSER_URL || 'http://127.0.0.1:5180';
const out = process.env.S05_EVIDENCE_DIR || '../evidencias/frontend-s05';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const credentials = [real ? supplied.credential : randomBytes(24).toString('hex'), randomBytes(24).toString('hex')];
const fixture = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Contenedores y plataformas', capacity: 100, available: 80 },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Seguridad en el laboratorio', capacity: 50, available: 0 },
  { id: '00000000-0000-4000-8000-000000000003', name: '<img src=x onerror=alert(1)> Texto de prueba con un nombre largo de evento', capacity: 60, available: 12 },
];
let expectedCredential = credentials[0], authPending = false, authStatus = 200, scenario = 'populated', calls = 0, stage = 'initial';
const logs = [], urls = [], runtimeErrors = [], statuses = [], actualResponses = [], results = [];
let headersSafe = true, dialogs = 0;
page.on('console', entry => logs.push(entry.text()));
page.on('pageerror', () => runtimeErrors.push('runtime-error'));
page.on('dialog', async dialog => { dialogs++; await dialog.dismiss(); });
page.on('request', request => {
  urls.push(request.url());
  if (new URL(request.url()).pathname.startsWith('/api/')) {
    calls++;
    headersSafe &&= request.method() === 'GET' && new URL(request.url()).pathname === '/api/catalogo'
      && request.headers()['x-api-key'] === expectedCredential;
  }
});
page.on('response', response => {
  if (new URL(response.url()).pathname === '/api/catalogo') {
    statuses.push(response.status());
    if (real && response.status() === 200) actualResponses.push(response.json().catch(() => null));
  }
});
if (!real) await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
  if (authPending) {
    authPending = false;
    return route.fulfill({ status: authStatus, contentType: 'application/json', body: JSON.stringify(authStatus === 200 ? { events: [] } : { detail: 'invalid_credentials' }) });
  }
  const current = scenario;
  if (current === 'network') return route.abort('connectionfailed');
  if (['populated', 'slow', 'leave'].includes(current)) await new Promise(resolve => setTimeout(resolve, current === 'populated' ? 250 : 600));
  const body = current === 'empty' ? { events: [] } : current === 'schema' ? { events: null }
    : current === 'new-identity' ? { events: [fixture[1]] }
      : current === 'slow' ? { events: [{ ...fixture[0], available: 30 }] } : { events: fixture };
  try { await route.fulfill({ status: current === 'unavailable' ? 503 : current === 'unauthorized' ? 401 : 200,
    contentType: current === 'html' ? 'text/html' : 'application/json',
    body: current === 'html' ? '<html>controlled proxy error</html>' : JSON.stringify(body) }); } catch { /* Deliberate navigation abort. */ }
});
function check(ok, name) { if (!ok) throw new Error(name); results.push({ name, passed: true }); }
const heading = () => page.getByRole('heading', { name: 'Encuentra tu próximo evento.' });
const cards = () => page.locator('.event-card');
const refresh = () => page.getByRole('button', { name: 'Actualizar catálogo', exact: true });
async function enter(credential = credentials[0]) {
  expectedCredential = credential;
  authPending = true;
  await page.getByLabel('Clave de laboratorio').fill(credential);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
async function ready() { await heading().waitFor(); await page.locator('section[aria-label="Catálogo de eventos"][aria-busy=false]').waitFor(); }
async function snapshot() { return cards().evaluateAll(nodes => nodes.map(node => node.textContent)); }
async function verifyFields(events) {
  check(await cards().count() === events.length, 'event-count-matches-response');
  for (let index = 0; index < events.length; index++) {
    const card = cards().nth(index), event = events[index];
    check(await card.getByRole('heading', { name: event.name, exact: true }).count() === 1
      && await card.locator('.event-available dd').textContent() === String(event.available)
      && await card.locator('dl>div').nth(1).locator('dd').textContent() === String(event.capacity)
      && await card.locator('.event-identifier dd').textContent() === event.id, `event-${index + 1}-fields`);
  }
}
try {
  await mkdir(out, { recursive: true });
  await page.goto(base);
  await page.getByLabel('Clave de laboratorio').waitFor();
  check(await cards().count() === 0, 'unauthenticated-no-catalog');
  if (!real) {
    stage = 'invalid-access'; authStatus = 401;
    await enter(credentials[1]);
    await page.getByRole('alert').filter({ hasText: 'La clave no es válida' }).waitFor();
    check(await heading().count() === 0, 'invalid-key-no-catalog');
    authStatus = 200;
  }
  stage = 'catalog-load';
  await enter();
  await heading().waitFor();
  if (!real) {
    await page.getByRole('status').filter({ hasText: 'Cargando eventos' }).waitFor();
    check(await cards().count() === 0, 'loading-does-not-invent-data');
    await page.screenshot({ path: `${out}/pantalla-carga.png`, fullPage: true });
  }
  await ready();
  if (real) {
    const responses = await Promise.all(actualResponses);
    const latest = responses.at(-1);
    if (!latest || !Array.isArray(latest.events)) throw new Error('Missing real catalog response');
    await verifyFields(latest.events);
    check(await heading().evaluate(node => document.activeElement === node), 'catalog-heading-focus');
    const previous = calls;
    await refresh().click();
    await ready();
    check(calls === previous + 1 && statuses.every(status => status === 200), 'real-refresh-single-get');
    await page.screenshot({ path: `${out}/pantalla-catalogo-real.png`, fullPage: true });
  } else {
    await verifyFields(fixture);
    check(await page.locator('.event-card img').count() === 0 && dialogs === 0, 'event-names-render-as-text');
    check(await page.getByText('SIN CUPOS EN ESTA LECTURA', { exact: true }).count() === 1, 'zero-stock-is-real-zero');
    check(await heading().evaluate(node => document.activeElement === node), 'catalog-heading-focus');
    for (const [name, width, height] of [['escritorio',1280,1000], ['movil',360,900]]) {
      await page.setViewportSize({ width, height });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}-no-overflow`);
      await page.screenshot({ path: `${out}/pantalla-${name}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    const previousData = JSON.stringify(await snapshot());
    const previousTime = await page.locator('time').getAttribute('datetime');
    for (const failure of ['unavailable', 'network', 'html', 'schema']) {
      stage = `refresh-${failure}`; scenario = failure;
      await refresh().click(); await ready();
      await page.getByRole('alert').filter({ hasText: 'Información desactualizada' }).waitFor();
      check(JSON.stringify(await snapshot()) === previousData && await page.locator('time').getAttribute('datetime') === previousTime,
        `${failure}-retains-data-with-stale-warning`);
    }
    await page.screenshot({ path: `${out}/pantalla-desactualizada.png`, fullPage: true });
    stage = 'refresh-success'; scenario = 'slow';
    const previous = calls;
    await refresh().evaluate(button => { button.click(); button.click(); });
    await page.getByRole('status').filter({ hasText: 'Actualizando el catálogo' }).waitFor();
    check(await page.getByRole('button', { name: 'Actualizando…' }).isDisabled(), 'refresh-in-progress-disabled');
    await ready();
    check(calls === previous + 1 && await cards().count() === 1 && await cards().first().locator('.event-available dd').textContent() === '30'
      && await page.getByRole('alert').count() === 0, 'one-refresh-replaces-data-and-clears-warning');
    stage = 'expired-key'; scenario = 'unauthorized';
    await refresh().click(); await page.getByLabel('Clave de laboratorio').waitFor();
    check(await cards().count() === 0, '401-removes-catalog-and-requires-key');
    stage = 'new-identity'; scenario = 'new-identity';
    await enter(credentials[1]); await ready();
    await verifyFields([fixture[1]]);
    check(await page.getByRole('heading', { name: fixture[0].name, exact: true }).count() === 0, 'new-session-no-previous-catalog');
    await page.getByRole('button', { name: 'Volver al acceso' }).click();
    stage = 'initial-error'; scenario = 'unavailable';
    await enter(); await ready();
    await page.getByRole('alert').filter({ hasText: 'No pudimos cargar el catálogo' }).waitFor();
    check(await cards().count() === 0 && await page.getByRole('heading', { name: 'No hay eventos disponibles' }).count() === 0, 'initial-error-distinct-from-empty');
    await page.screenshot({ path: `${out}/pantalla-error-inicial.png`, fullPage: true });
    stage = 'retry-empty'; scenario = 'empty';
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click(); await ready();
    await page.getByRole('heading', { name: 'No hay eventos disponibles' }).waitFor();
    check(await page.getByRole('alert').count() === 0 && await cards().count() === 0, 'retry-to-valid-empty-catalog');
    await page.screenshot({ path: `${out}/pantalla-vacia.png`, fullPage: true });
    scenario = 'unavailable'; await refresh().click(); await ready();
    check(await page.getByRole('alert').filter({ hasText: 'Información desactualizada' }).count() === 1, 'empty-cache-also-marked-stale');
    stage = 'leave-during-refresh'; scenario = 'leave';
    await refresh().click();
    await page.getByRole('button', { name: 'Volver al acceso' }).click();
    await page.getByLabel('Clave de laboratorio').waitFor();
    await page.waitForTimeout(700);
    check(await heading().count() === 0 && await cards().count() === 0, 'late-response-after-leaving-ignored');
  }
  const storage = await page.evaluate(() => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage), cookie: document.cookie,
    html: document.documentElement.outerHTML }));
  check(headersSafe && runtimeErrors.length === 0 && credentials.every(value => !JSON.stringify({ logs, urls, storage, results }).includes(value)), 'header-storage-url-log-and-runtime-safety');
  await page.reload(); await page.getByLabel('Clave de laboratorio').waitFor();
  check(await cards().count() === 0, 'reload-requires-access');
  await writeFile(`${out}/${real ? 'catalog-real' : 'catalog-controlled'}.json`, JSON.stringify({ sprint:'S05', date:new Date().toISOString(), mode:real ? 'real-local-api' : 'intercepted-responses',
    browser:browser.version(), passed:true, checks:results.length, results, requests:calls, statuses, credentialsRecorded:false, reservationsCreated:0 }, null, 2));
  console.log(`S05 ${real ? 'real API' : 'controlled'}: ${results.length} checks passed; no credentials recorded.`);
} catch { console.error(`S05 verification failed at stage ${stage}; diagnostic values omitted.`); process.exitCode = 1; }
finally { await browser.close(); }
