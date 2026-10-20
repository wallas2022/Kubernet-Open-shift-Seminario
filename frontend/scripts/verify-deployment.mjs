import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base = process.env.S18_BROWSER_URL || 'http://127.0.0.1:8080';
const out = process.env.S18_EVIDENCE_DIR || '../evidencias/frontend-s18';
const env = await readFile('../.runtime/s18/compose.env', 'utf8');
const key = Object.keys(JSON.parse(env.match(/^CLIENT_KEYS_JSON='(.+)'$/m)[1]))[0];
const checks = [];
function check(ok, name) { if (!ok) throw Error(name); checks.push({ name, passed: true }); }
async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  return { status: response.status, headers: response.headers, text: await response.text() };
}
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const root = await request('/');
  check(root.status === 200 && root.text.includes('id="root"'), 'compiled-spa-served');
  for (const [name, value] of [['x-frame-options', 'DENY'], ['x-content-type-options', 'nosniff'], ['referrer-policy', 'no-referrer'], ['cache-control', 'no-store']]) {
    check(root.headers.get(name) === value, `security-header-${name}`);
  }
  for (const path of ['/recorrido/consulta', '/recorrido/consulta/']) {
    const result = await request(path);
    check(result.status === 200 && result.text === root.text, `spa-reload-${path}`);
  }
  for (const path of ['/assets/missing.js', '/.env', '/.env.local', '/.git/config']) {
    check((await request(path)).status === 404, `no-static-leak-${path}`);
  }
  for (const path of ['/health/live', '/health/ready']) check((await request(path)).status === 200, `probe-${path}`);
  const asset = root.text.match(/src="([^"]+\.js)"/)[1];
  const bundle = await request(asset);
  check(bundle.status === 200 && !bundle.text.includes(key), 'compiled-bundle-no-credential');
  check((await request('/api/catalogo')).status === 401, 'unauthenticated-api-remains-401');
  const headers = { 'X-Api-Key': key };
  const catalog = await request('/api/catalogo', { headers });
  const events = JSON.parse(catalog.text).events;
  check(catalog.status === 200 && events.length > 0 && events[0].capacity === 25, 'real-exclusive-s18-catalog-proxy');
  for (const path of ['/api', '/api/unknown', '/api/catalogo/unknown']) {
    const response = await request(path, { headers });
    check(response.status === 404 && !response.text.includes('id="root"'), `unknown-api-not-spa-${path}`);
  }
  check((await request('/api/catalogo?key=' + key, { headers })).status === 400, 'api-query-rejected');
  const eventId = events[0].id;
  const post = { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'Idempotency-Key': 's18-pv15-http' }, body: JSON.stringify({ event_id: eventId, quantity: 2 }) };
  const created = await request('/api/reservas', post);
  check(created.status === 201, 'real-post-through-proxy-201');
  const repeated = await request('/api/reservas', post);
  const reservation = JSON.parse(created.text);
  check(repeated.status === 200 && JSON.parse(repeated.text).id === reservation.id, 'idempotency-header-and-payload-preserved');
  const looked = await request('/api/reservas/' + reservation.id, { headers });
  check(looked.status === 200 && JSON.parse(looked.text).quantity === 2, 'real-lookup-through-proxy');
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await context.newPage();
  const errors = []; const urls = []; let posts = 0;
  page.on('pageerror', () => errors.push('pageerror'));
  page.on('request', request => { urls.push(request.url()); if (request.method() === 'POST') posts++; });
  await page.goto(base + '/recorrido/consulta');
  await page.getByLabel('Clave de laboratorio').fill(key);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
  await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  await page.getByLabel('Cantidad de cupos').fill('2');
  for (const name of ['Revisar cantidad', 'Confirmar cantidad', 'Enviar reserva']) await page.getByRole('button', { name, exact: true }).click();
  const receipt = page.getByRole('region', { name: 'Comprobante de reserva' });
  await receipt.waitFor();
  check(await receipt.isVisible() && posts === 1, 'browser-real-confirmation-one-post');
  await page.screenshot({ path: `${out}/comprobante-proxy-real.png`, fullPage: true });
  check(!urls.some(url => url.includes(key)), 'browser-credential-never-in-url');
  check(await page.evaluate(key => !JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }).includes(key), key), 'browser-credential-not-persisted');
  await page.reload();
  await page.getByLabel('Clave de laboratorio').waitFor();
  check(await page.getByLabel('Clave de laboratorio').inputValue() === '', 'spa-reload-clears-credential');
  check(errors.length === 0, 'compiled-browser-no-page-errors');
  await page.screenshot({ path: `${out}/recarga-spa.png`, fullPage: true });
  await context.close();
  await writeFile(`${out}/deployment-real.json`, JSON.stringify({ sprint: 'S18', topology: 'Compose exclusive S18 PostgreSQL + API + compiled Nginx frontend', browser: browser.version(), mocks: false, checks, passed: checks.length, clusterAdmission: 'not-executed-no-context', https: 'prepared-not-executed' }, null, 2));
  console.log(`S18: ${checks.length} deployment checks passed`);
} finally { await browser.close(); }
