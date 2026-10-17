import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const real = process.argv.includes('--real');
const supplied = real ? JSON.parse(readFileSync(0, 'utf8')) : null;
const base = process.env.S04_BROWSER_URL || 'http://127.0.0.1:5180';
const out = process.env.S04_EVIDENCE_DIR || '../evidencias/frontend-s04';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const credentials = [real ? supplied.credential : randomBytes(24).toString('hex'), randomBytes(24).toString('hex')];
const logs = [], urls = [], runtimeErrors = [], statuses = [];
let active = 'empty', calls = 0, headersSafe = true, stage = 'initial';
let expectedCredential = credentials[0];
const results = [];
page.on('console', entry => logs.push(entry.text()));
page.on('pageerror', () => runtimeErrors.push('runtime-error'));
page.on('request', request => {
  urls.push(request.url());
  if (new URL(request.url()).pathname.startsWith('/api/')) {
    calls++;
    headersSafe &&= request.method() === 'GET' && new URL(request.url()).pathname === '/api/catalogo'
      && request.headers()['x-api-key'] === expectedCredential;
  }
});
page.on('response', response => {
  if (new URL(response.url()).pathname === '/api/catalogo') statuses.push(response.status());
});
if (!real) await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
  const scenario = active;
  if (scenario === 'network') return route.abort('connectionfailed');
  if (scenario === 'slow' || scenario === 'hide') await new Promise(resolve => setTimeout(resolve, scenario === 'slow' ? 600 : 250));
  if (scenario === 'timeout') await new Promise(resolve => setTimeout(resolve, 16_000));
  const body = scenario === 'invalid' ? { detail: 'invalid_credentials' }
    : scenario === 'unavailable' ? { error: 'database_unavailable' }
      : scenario === 'schema' ? { events: null }
        : scenario === 'events' ? { events: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Evento controlado', capacity: 10, available: 4 }] }
          : { events: [] };
  try { await route.fulfill({ status: scenario === 'invalid' ? 401 : scenario === 'unavailable' ? 503 : 200,
    contentType: scenario === 'html' ? 'text/html' : 'application/json',
    body: scenario === 'html' ? '<html>controlled proxy response</html>' : JSON.stringify(body) }); } catch { /* Intentional abort. */ }
});
function check(ok, name) { if (!ok) throw new Error(`Failed: ${name}`); results.push({ name, passed: true }); }
const field = () => page.getByLabel('Clave de laboratorio');
const enter = () => page.getByRole('button', { name: 'Entrar', exact: true });
async function initial() { await page.goto(base); await enter().waitFor(); }
async function submit(credential = credentials[0]) {
  expectedCredential = credential;
  await field().fill(credential);
  await enter().click();
}
async function success() {
  await page.getByRole('heading', { name: 'Ya estás dentro.' }).waitFor();
  check(await page.locator('input[type=password]').count() === 0, 'success-field-removed');
  check(await page.getByRole('heading', { name: 'Ya estás dentro.' }).evaluate(node => document.activeElement === node), 'success-focus');
}
try {
  await mkdir(out, { recursive: true });
  await initial();
  check(await field().getAttribute('type') === 'password', 'masked-field');
  await enter().click();
  await page.getByRole('alert').waitFor();
  check(calls === 0, 'blank-does-not-call-api');
  if (real) {
    stage = 'real-invalid';
    await submit(credentials[1]);
    await page.getByRole('alert').filter({ hasText: 'La clave no es válida' }).waitFor();
    check(statuses.at(-1) === 401 && await field().inputValue() === '', 'real-401-denied');
    stage = 'real-valid';
    await submit();
    await success();
    check(statuses.at(-1) === 200 && calls === 2, 'real-200-access');
    await page.screenshot({ path: `${out}/pantalla-real-validada.png`, fullPage: true });
  } else {
    for (const scenario of ['invalid', 'unavailable', 'html', 'schema', 'network', 'timeout']) {
      stage = scenario;
      active = scenario;
      const previous = calls;
      const started = Date.now();
      await submit();
      await page.getByRole('alert').filter({ hasText: scenario === 'invalid' ? 'La clave no es válida' : 'No pudimos comprobar el acceso' }).waitFor({ timeout: 22_000 });
      check(calls === previous + 1 && await field().inputValue() === '', `${scenario}-denied-and-cleared`);
      check(await page.getByRole('heading', { name: 'Ya estás dentro.' }).count() === 0, `${scenario}-not-authenticated`);
      if (scenario === 'invalid') await page.screenshot({ path: `${out}/pantalla-clave-invalida.png`, fullPage: true });
      if (scenario === 'timeout') check(Date.now() - started >= 14_000, 'default-timeout-observed');
    }
    await page.screenshot({ path: `${out}/pantalla-error-tecnico.png`, fullPage: true });
    for (const scenario of ['empty', 'events']) {
      stage = scenario;
      active = scenario;
      await submit();
      await success();
      check(true, `${scenario}-catalog-allows-access`);
      if (scenario === 'empty') await page.screenshot({ path: `${out}/pantalla-acceso-validado.png`, fullPage: true });
      await page.reload();
      await enter().waitFor();
      check(await field().inputValue() === '', 'reload-requires-key');
    }
    stage = 'double-submit';
    active = 'slow';
    expectedCredential = credentials[0];
    await field().fill(credentials[0]);
    const previous = calls;
    await page.locator('.access-panel form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    check(await page.getByRole('button', { name: 'Comprobando…', exact: true }).isDisabled()
      && await page.getByRole('heading', { name: 'Ya estás dentro.' }).count() === 0, 'not-authenticated-before-response');
    await success();
    check(calls === previous + 1, 'double-submit-one-request');
    await page.getByRole('button', { name: 'Volver al acceso' }).click();
    await enter().waitFor();
    stage = 'pagehide';
    active = 'hide';
    const started = page.waitForRequest(request => new URL(request.url()).pathname === '/api/catalogo');
    await submit();
    await started;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await enter().waitFor();
    await page.waitForTimeout(350);
    check(await page.getByRole('heading', { name: 'Ya estás dentro.' }).count() === 0, 'late-response-does-not-reopen-access');
    for (const [name, width, height] of [['escritorio', 1280, 1000], ['movil', 360, 900]]) {
      await page.setViewportSize({ width, height });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}-no-horizontal-overflow`);
      await page.screenshot({ path: `${out}/pantalla-${name}.png`, fullPage: true });
    }
  }
  const state = await page.evaluate(async () => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage), cookie: document.cookie,
    databases: await indexedDB.databases(), caches: await caches.keys(), html: document.documentElement.outerHTML }));
  check(headersSafe && runtimeErrors.length === 0 && credentials.every(value => !JSON.stringify({ logs, urls, state, results }).includes(value)), 'headers-storage-url-logs-and-runtime');
  await page.reload();
  await enter().waitFor();
  check(await field().inputValue() === '', 'final-reload-clears-access');
  await writeFile(`${out}/${real ? 'access-real' : 'access-controlled'}.json`, JSON.stringify({ sprint: 'S04', date: new Date().toISOString(), browser: browser.version(),
    mode: real ? 'real-local-api' : 'intercepted-responses', passed: true, checks: results.length, results, requests: calls, statuses,
    credentialsRecorded: false, reservationsCreated: 0, scope: real ? 'GET /catalogo through local frontend proxy, valid and invalid credentials.' : 'UI controlled scenarios, including 15-second default timeout.' }, null, 2));
  console.log(`S04 ${real ? 'real API' : 'controlled'}: ${results.length} checks passed; no credentials recorded.`);
} catch {
  console.error(`S04 verification failed at stage ${stage}; diagnostic values omitted.`);
  process.exitCode = 1;
} finally { await browser.close(); }
