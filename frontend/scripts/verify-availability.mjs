import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const real = process.argv.includes('--real');
const credential = real ? JSON.parse(readFileSync(0, 'utf8')).credential : randomBytes(24).toString('hex');
const base = process.env.S06_BROWSER_URL || 'http://127.0.0.1:5180';
const out = process.env.S06_EVIDENCE_DIR || '../evidencias/frontend-s06';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const events = [
  { id:'00000000-0000-4000-8000-000000000001', name:'Disponibilidad de contenedores', capacity:100, available:80 },
  { id:'00000000-0000-4000-8000-000000000002', name:'Otro evento del laboratorio con un nombre largo para comprobar el cambio de selección', capacity:50, available:25 },
];
const availabilityPath = /^\/api\/eventos\/[0-9a-f-]+\/disponibilidad$/i;
let scenario = 'positive', stage = 'initial', calls = 0, headersSafe = true;
const results = [], urls = [], logs = [], runtimeErrors = [], statuses = [], catalogResponses = [], stockResponses = [];
page.on('console', entry => logs.push(entry.text()));
page.on('pageerror', () => runtimeErrors.push('runtime-error'));
page.on('request', request => {
  urls.push(request.url());
  const path = new URL(request.url()).pathname;
  if (path.startsWith('/api/')) {
    calls++;
    headersSafe &&= request.method() === 'GET' && (path === '/api/catalogo' || availabilityPath.test(path))
      && request.headers()['x-api-key'] === credential;
  }
});
page.on('response', response => {
  const path = new URL(response.url()).pathname;
  if (path.startsWith('/api/')) statuses.push({ path, status:response.status() });
  if (real && response.status() === 200) {
    if (path === '/api/catalogo') catalogResponses.push(response.json().catch(() => null));
    else if (availabilityPath.test(path)) stockResponses.push(response.json().catch(() => null));
  }
});
if (!real) await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/catalogo') return route.fulfill({ contentType:'application/json', body:JSON.stringify({ events }) });
  const current = scenario, id = path.split('/')[3];
  if (current === 'network') return route.abort('connectionfailed');
  if (['positive','slow','late'].includes(current)) await new Promise(resolve => setTimeout(resolve, current === 'positive' ? 250 : 600));
  const body = current === 'not-found' ? { error:'event_not_found' } : current === 'unauthorized' ? { detail:'invalid_credentials' }
    : current === 'schema' ? { id, capacity:10, available:11 }
      : { id, capacity:id === events[0].id ? 100 : 50, available:current === 'zero' ? 0 : current === 'slow' ? 4 : id === events[0].id ? 9 : 3 };
  try { await route.fulfill({ status:current === 'not-found' ? 404 : current === 'unauthorized' ? 401 : current === 'unavailable' ? 503 : 200,
    contentType:current === 'html' ? 'text/html' : 'application/json', body:current === 'html' ? '<html>controlled response</html>' : JSON.stringify(body) }); } catch { /* Navigation can abort. */ }
});
function check(ok, name) { if (!ok) throw new Error(name); results.push({ name, passed:true }); }
const region = () => page.locator('section[aria-label="Disponibilidad del evento"]');
const stock = () => page.locator('.availability-count dd');
const refresh = () => page.getByRole('button', { name:'Actualizar disponibilidad', exact:true });
async function login() {
  await page.getByLabel('Clave de laboratorio').fill(credential);
  await page.getByRole('button', { name:'Entrar', exact:true }).click();
  await page.locator('.event-card').first().waitFor();
}
async function ready() { await page.locator('section[aria-label="Disponibilidad del evento"][aria-busy=false]').waitFor(); }
async function select(index = 0) { await page.locator('.event-card').nth(index).getByRole('button', { name:/Consultar disponibilidad/ }).click(); }
async function verifyFields(expected) {
  check(await stock().textContent() === String(expected.available)
    && await page.locator('.availability-card dl>div').nth(1).locator('dd').textContent() === String(expected.capacity)
    && await page.locator('.availability-id dd').textContent() === expected.id, 'availability-fields-match-endpoint');
}
try {
  await mkdir(out, { recursive:true });
  await page.goto(base); await page.getByLabel('Clave de laboratorio').waitFor();
  stage = 'select'; await login(); await select();
  if (!real) {
    await page.getByRole('status').filter({ hasText:'Consultando disponibilidad' }).waitFor();
    check(await page.locator('.availability-card').count() === 0, 'loading-does-not-copy-catalog-stock');
  }
  await ready();
  if (real) {
    const response = (await Promise.all(stockResponses)).at(-1);
    const catalog = (await Promise.all(catalogResponses)).at(-1);
    if (!response || !catalog?.events?.length) throw new Error('No real selected event');
    await verifyFields(response);
    check(response.id === catalog.events[0].id, 'real-selected-event-id');
    const previous = calls;
    await refresh().click(); await ready();
    await verifyFields((await Promise.all(stockResponses)).at(-1));
    check(calls === previous + 1, 'real-refresh-single-get');
    await page.screenshot({ path:`${out}/pantalla-disponibilidad-real.png`, fullPage:true });
  } else {
    await verifyFields({ id:events[0].id, capacity:100, available:9 });
    check(await page.getByRole('heading', { level:1 }).evaluate(node => document.activeElement === node), 'event-heading-focus');
    check(await page.locator('time').getAttribute('datetime') !== null && await page.getByText(/no garantiza inventario/).count() === 1, 'reading-time-and-inventory-warning');
    for (const [name,width,height] of [['escritorio',1280,1000],['movil',360,900]]) {
      await page.setViewportSize({ width,height });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}-no-overflow`);
      await page.screenshot({ path:`${out}/pantalla-${name}.png`, fullPage:true });
    }
    await page.setViewportSize({ width:1280,height:1000 });
    const lastTime = await page.locator('time').getAttribute('datetime');
    for (const failure of ['unavailable','network','html','schema']) {
      stage = failure; scenario = failure; await refresh().click(); await ready();
      check(await stock().textContent() === '9' && await page.locator('time').getAttribute('datetime') === lastTime
        && await page.getByRole('alert').filter({ hasText:'Disponibilidad desactualizada' }).count() === 1, `${failure}-retains-marked-reading`);
    }
    await page.screenshot({ path:`${out}/pantalla-desactualizada.png`, fullPage:true });
    stage = 'zero'; scenario = 'zero'; await refresh().click(); await ready();
    check(await stock().textContent() === '0' && await page.getByRole('button', { name:'Reservar', exact:true }).isDisabled()
      && await page.getByText('Sin cupos disponibles en esta lectura.', { exact:true }).count() === 1
      && await page.getByRole('alert').count() === 0, 'zero-stock-blocks-reservation');
    await page.screenshot({ path:`${out}/pantalla-sin-cupos.png`, fullPage:true });
    stage = 'not-found'; scenario = 'not-found'; await refresh().click(); await ready();
    check(await page.getByRole('alert').filter({ hasText:'Evento no disponible' }).count() === 1
      && await page.locator('.availability-card').count() === 0 && await page.locator('time').count() === 0
      && await page.getByRole('button', { name:'Reservar', exact:true }).count() === 0, '404-discards-previous-reading');
    await page.screenshot({ path:`${out}/pantalla-evento-no-disponible.png`, fullPage:true });
    stage = 'first-error'; scenario = 'unavailable'; await refresh().click(); await ready();
    check(await page.getByRole('alert').filter({ hasText:'No pudimos consultar los cupos' }).count() === 1
      && await stock().count() === 0, 'error-without-data-does-not-invent-stock');
    stage = 'duplicate-refresh'; scenario = 'slow'; const previous = calls;
    await refresh().evaluate(button => { button.click(); button.click(); });
    check(await page.getByRole('button', { name:'Actualizando…' }).isDisabled(), 'refresh-wait-disabled');
    await ready();
    check(calls === previous + 1 && await stock().textContent() === '4' && await page.getByRole('alert').count() === 0, 'single-refresh-updates-stock');
    stage = '401'; scenario = 'unauthorized'; await refresh().click();
    await page.getByLabel('Clave de laboratorio').waitFor();
    check(await region().count() === 0, '401-clears-session-and-view');
    stage = 'switch-events'; scenario = 'late'; await login(); await select();
    await page.getByRole('status').filter({ hasText:'Consultando disponibilidad' }).waitFor();
    await page.getByRole('button', { name:'← Volver al catálogo' }).click();
    check(await page.getByRole('heading', { level:1 }).evaluate(node => document.activeElement === node), 'back-restores-catalog-focus');
    scenario = 'positive'; await select(1); await ready(); await page.waitForTimeout(700);
    await verifyFields({ id:events[1].id, capacity:50, available:3 });
    check(await page.getByRole('heading', { name:events[1].name, exact:true }).count() === 1, 'late-first-event-cannot-overwrite-second');
  }
  const state = await page.evaluate(() => JSON.stringify({ local:Object.entries(localStorage), session:Object.entries(sessionStorage), cookie:document.cookie, html:document.documentElement.outerHTML }));
  check(headersSafe && runtimeErrors.length === 0 && !JSON.stringify({ logs,urls,state,results }).includes(credential), 'headers-storage-url-logs-and-runtime-safe');
  await page.reload(); await page.getByLabel('Clave de laboratorio').waitFor();
  check(await region().count() === 0, 'reload-requires-access');
  await writeFile(`${out}/${real ? 'availability-real' : 'availability-controlled'}.json`, JSON.stringify({ sprint:'S06', date:new Date().toISOString(), mode:real ? 'real-local-api' : 'intercepted-responses',
    browser:browser.version(), passed:true, checks:results.length, results, requests:calls, statuses, credentialsRecorded:false, reservationsCreated:0 }, null, 2));
  console.log(`S06 ${real ? 'real API' : 'controlled'}: ${results.length} checks passed; no credentials recorded.`);
} catch { console.error(`S06 verification failed at stage ${stage}; diagnostic values omitted.`); process.exitCode=1; }
finally { await browser.close(); }
