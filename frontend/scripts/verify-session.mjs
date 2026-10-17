import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.S02_BROWSER_URL || 'http://127.0.0.1:5180';
const out = process.env.S02_EVIDENCE_DIR || '../evidencias/frontend-s02';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext();
const page = await context.newPage();
const secrets = [randomBytes(24).toString('hex'), randomBytes(24).toString('hex')];
const logs = [], errors = [], requests = [];
page.on('console', msg => logs.push(msg.text()));
page.on('pageerror', () => errors.push('browser-error'));
page.on('request', request => requests.push(request.url()));
let checks = 0;
function check(ok) { if (!ok) throw new Error(`Session check ${checks + 1} failed`); checks++; }
async function status(text) { await page.getByRole('status').filter({ hasText: text }).waitFor(); }
async function inspect() {
  return page.evaluate(async () => ({
    local: JSON.stringify(Object.entries(localStorage)), session: JSON.stringify(Object.entries(sessionStorage)),
    cookies: document.cookie, html: document.documentElement.outerHTML,
    url: location.href, databases: await indexedDB.databases(), caches: await caches.keys(),
  }));
}
try {
  await page.goto(base);
  await status('Sin credencial en memoria.');
  check(await page.locator('#credential').getAttribute('type') === 'password');
  for (const secret of secrets) {
    await page.getByLabel('Credencial temporal').fill(secret);
    await page.getByRole('button', { name: 'Conservar en memoria' }).click();
    await status('Credencial temporal presente.');
    check(await page.getByLabel('Credencial temporal').inputValue() === '');
    const state = await inspect();
    check(secrets.every(value => !JSON.stringify(state).includes(value)));
    check(state.local === '[]' && state.session === '[]' && state.cookies === '' && state.databases.length === 0 && state.caches.length === 0);
  }
  await page.reload();
  await status('Sin credencial en memoria.');
  check(await page.getByLabel('Credencial temporal').inputValue() === '');
  await page.getByLabel('Credencial temporal').fill(secrets[0]);
  await page.getByRole('button', { name: 'Conservar en memoria' }).click();
  await status('Credencial temporal presente.');
  await page.getByLabel('Credencial temporal').fill(secrets[1]);
  await page.getByRole('button', { name: 'Limpiar credencial' }).click();
  await status('Sin credencial en memoria.');
  check((await inspect()).session === '[]' && await page.getByLabel('Credencial temporal').inputValue() === '');
  await page.getByRole('button', { name: 'Conservar en memoria' }).click();
  await page.getByRole('alert').waitFor();
  check(await page.getByLabel('Credencial temporal').getAttribute('aria-invalid') === 'true');
  await page.getByLabel('Credencial temporal').fill(secrets[0]);
  await page.getByRole('button', { name: 'Conservar en memoria' }).click();
  await status('Credencial temporal presente.');
  await page.getByLabel('Credencial temporal').fill(secrets[1]);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await status('Sin credencial en memoria.');
  check(await page.getByLabel('Credencial temporal').inputValue() === '');
  const other = await context.newPage();
  await other.goto(base);
  await other.getByRole('status').filter({ hasText: 'Sin credencial en memoria.' }).waitFor();
  check(true);
  check(!requests.some(url => new URL(url).pathname.startsWith('/api')));
  check(secrets.every(value => !JSON.stringify({ requests, logs }).includes(value)) && errors.length === 0);
  await mkdir(out, { recursive: true });
  for (const [name, width, height] of [['escritorio',1280,1000],['movil',360,900]]) {
    await page.setViewportSize({ width, height });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/pantalla-${name}.png`, fullPage: true });
  }
  await writeFile(`${out}/session.json`, JSON.stringify({ sprint:'S02', date:new Date().toISOString(), browser:browser.version(), checks, passed:true, credentialsRecorded:false, scope:'memory, reload, clear, pagehide, isolation, browser storage, logs and no API requests' }, null, 2));
  console.log(`S02: ${checks} browser checks passed; no credentials recorded.`);
} finally { await browser.close(); }
