import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.S03_BROWSER_URL || 'http://127.0.0.1:5180';
const out = process.env.S03_EVIDENCE_DIR || '../evidencias/frontend-s03';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const secret = randomBytes(24).toString('hex');
const eventId = '00000000-0000-4000-8000-000000000001';
const reservationId = '00000000-0000-4000-8000-000000000002';
const cases = [
  { name: 'catalog-empty', method: 'GET', status: 200, body: { events: [] }, expected: 'success' },
  { name: 'unauthorized-detail', method: 'GET', status: 401, body: { detail: 'invalid_credentials' }, expected: 'invalid_credentials' },
  { name: 'post-created', method: 'POST', status: 201, body: { id: reservationId, event_id: eventId, quantity: 2, status: 'confirmed', created_at: '2026-10-17T12:00:00Z' }, expected: 'success' },
  { name: 'post-replayed', method: 'POST', status: 200, body: { id: reservationId, event_id: eventId, quantity: 2, status: 'confirmed', created_at: '2026-10-17T12:00:00Z' }, expected: 'success' },
  { name: 'html-proxy', method: 'POST', status: 200, html: true, expected: 'unexpected_response' },
  { name: 'empty-proxy', method: 'POST', status: 200, empty: true, expected: 'unexpected_response' },
  { name: 'post-unavailable', method: 'POST', status: 503, body: { error: 'database_unavailable' }, expected: 'database_unavailable' },
  { name: 'post-disconnected', method: 'POST', disconnected: true, expected: 'network_error' },
  { name: 'post-timeout', method: 'POST', delayed: true, status: 200, body: {}, expected: 'timeout' },
  { name: 'redirect-blocked', method: 'POST', redirect: true, expected: 'network_error' },
];
let active, requestCount = 0;
const logs = [], urls = [], runtimeErrors = [];
let headersSafe = true;
page.on('console', entry => logs.push(entry.text()));
page.on('pageerror', () => runtimeErrors.push('runtime-error'));
page.on('request', request => urls.push(request.url()));
await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
  requestCount++;
  const request = route.request();
  headersSafe &&= request.headers()['x-api-key'] === secret && request.method() === active.method
    && !request.url().includes(secret);
  if (active.method === 'POST') headersSafe &&= request.headers()['idempotency-key'] === 'browser-controlled-operation'
    && request.postData() === JSON.stringify({ event_id: eventId, quantity: 2 });
  if (active.disconnected) return route.abort('connectionfailed');
  if (active.redirect) return route.fulfill({ status: 302, headers: { Location: '/api/redirect-target' }, body: '' });
  const response = { status: active.status, contentType: active.html ? 'text/html' : 'application/json',
    body: active.html ? '<html>controlled proxy response</html>' : active.empty ? '' : JSON.stringify(active.body),
    headers: active.status === 503 ? { 'Retry-After': '2' } : {} };
  if (active.delayed) await new Promise(resolve => setTimeout(resolve, 180));
  try { await route.fulfill(response); } catch { /* A deliberate timeout can close this intercepted request. */ }
});
try {
  await page.goto(base);
  await page.locator('h1').waitFor();
  const results = [];
  for (const scenario of cases) {
    active = scenario;
    const previous = requestCount;
    const result = await page.evaluate(async ({ secret, eventId, method, delayed }) => {
      const { createApiClient } = await import('/src/api/client.ts');
      const client = createApiClient({ readCredential: () => secret, timeoutMs: delayed ? 40 : 2000 });
      return method === 'POST' ? client.createReservation({ operationKey: 'browser-controlled-operation', eventId, quantity: 2 }) : client.catalog();
    }, { secret, eventId, method: scenario.method, delayed: scenario.delayed });
    const code = result.ok ? 'success' : result.code;
    if (code !== scenario.expected || requestCount !== previous + 1)
      throw new Error(`Controlled browser case failed: ${scenario.name}`);
    if (!result.ok && scenario.method === 'POST' && result.outcome !== 'uncertain')
      throw new Error('POST outcome was not conservative.');
    if (scenario.status === 503 && result.retryAfterSeconds !== 2) throw new Error('Retry-After guidance absent.');
    results.push({ name: scenario.name, passed: true, result: code, outcome: result.ok ? 'confirmed-response-fixture' : result.outcome, requests: 1 });
  }
  const storage = await page.evaluate(() => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage), cookie: document.cookie }));
  if (!headersSafe || JSON.stringify({ logs, urls, storage, results }).includes(secret) || runtimeErrors.length)
    throw new Error('Browser secrecy or runtime check failed.');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/http-browser.json`, JSON.stringify({ sprint: 'S03', date: new Date().toISOString(), browser: browser.version(), passed: true,
    cases: results, headerAndSecrecyChecks: true, credentialsRecorded: false, backendRequests: 0,
    scope: 'Intercepted Chromium responses; no real reservation, database commit or recovery tested.' }, null, 2));
  console.log(`S03: ${results.length} controlled Chromium cases passed; credentials not recorded.`);
} finally { await browser.close(); }
