import { chromium } from 'playwright';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const real = process.argv.includes('--real');
const identity = real ? JSON.parse(readFileSync(0, 'utf8')) : { credential: randomBytes(32).toString('hex'), other: randomBytes(32).toString('hex') };
const base = process.env.S10_BROWSER_URL || 'http://127.0.0.1:5183';
const out = process.env.S10_EVIDENCE_DIR || '../evidencias/frontend-s10';
const key = 'seminario.reserva.pendiente.v1', event = '00000000-0000-0000-0000-000000000001';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const contexts = [], results = [], logs = [], urls = [], runtimeErrors = [];
let stage = 'setup', originalId;
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function scenario(mode) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } }); contexts.push(context);
  if (mode === 'corrupt') await context.addInitScript(key => sessionStorage.setItem(key, '{broken'), key);
  if (mode === 'storage-denied') await context.addInitScript(key => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (name) { if (name === key) throw Error('denied'); return get.call(this, name); };
  }, key);
  const page = await context.newPage(); let posts = 0, wire, lost = true, recoveredId;
  page.on('console', message => logs.push(message.text())); page.on('request', request => urls.push(request.url()));
  page.on('pageerror', () => runtimeErrors.push('runtime-error'));
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== 'POST') {
      if (real) return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(path === '/api/catalogo'
        ? { events: [{ id: event, name: 'Recuperación sin duplicados', capacity: 25, available: 25 }] } : { id: event, capacity: 25, available: 25 }) });
    }
    posts++;
    const current = { payload: request.postDataJSON(), operationKey: request.headers()['idempotency-key'] };
    if (!wire) wire = current; else check(JSON.stringify(wire) === JSON.stringify(current), `${mode}-attempt-${posts}-original-key-and-payload`);
    check(request.headers()['x-api-key'] === identity.credential, `${mode}-attempt-${posts}-original-identity`);
    const pending = JSON.parse(await page.evaluate(key => sessionStorage.getItem(key), key));
    check(pending.operationKey === current.operationKey && pending.quantity === 2, `${mode}-attempt-${posts}-pending-before-dispatch`);
    let response, body;
    if (real) { response = await route.fetch(); body = await response.json(); check(response.status() === (posts === 1 ? 201 : 200), `real-attempt-${posts}-status`); }
    else body = { id: originalId || randomUUID(), event_id: event, quantity: 2, status: 'confirmed', created_at: '2026-10-19T15:00:00Z' };
    if (posts === 1) originalId = body.id;
    else check(body.id === originalId, `${mode}-attempt-${posts}-same-reservation-uuid`);
    if (lost) await route.abort('failed');
    else { recoveredId = body.id; await route.fulfill(real ? { response } : { status: 200, contentType: 'application/json', body: JSON.stringify(body) }); }
  });
  async function login(credential) {
    await page.getByLabel('Clave de laboratorio').fill(credential);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  await page.goto(base); await login(identity.credential);
  if (mode === 'corrupt' || mode === 'storage-denied') {
    await page.getByRole('heading', { name: 'Recupera tu operación' }).waitFor();
    check(await page.getByRole('button', { name: 'Recuperar operación pendiente' }).count() === 0 && posts === 0, `${mode}-no-post-or-recovery-control`);
    check(await page.getByRole('button', { name: 'Reservar', exact: true }).count() === 0, `${mode}-no-new-intention`);
    if (mode === 'corrupt') check(await page.evaluate(key => sessionStorage.getItem(key), key) === '{broken', 'corrupt-record-preserved');
    return;
  }
  await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
  await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  await page.getByLabel('Cantidad de cupos').fill('2');
  await page.getByRole('button', { name: 'Revisar cantidad' }).click();
  await page.getByRole('button', { name: 'Confirmar cantidad' }).click();
  await page.getByRole('button', { name: 'Enviar reserva', exact: true }).click();
  await page.getByText(/No pudimos confirmar el resultado/).waitFor();
  const raw = await page.evaluate(key => sessionStorage.getItem(key), key);
  check(JSON.parse(raw).credentialFingerprint === createHash('sha256').update(identity.credential).digest('hex'), 'fingerprint-only-in-pending');
  await page.reload();
  check(await page.getByLabel('Clave de laboratorio').inputValue() === '', 'reload-clears-credential');
  check(posts === 1, 'reload-never-retries');
  await login(identity.other);
  await page.getByRole('button', { name: 'Recuperar operación pendiente' }).click();
  await page.getByText(/La clave no corresponde/).waitFor();
  check(posts === 1 && await page.evaluate(key => sessionStorage.getItem(key), key) === raw, 'other-valid-identity-no-post-and-pending-unchanged');
  await page.getByRole('button', { name: 'Usar otra clave de laboratorio' }).click();
  await login(identity.credential);
  check(posts === 1, 'matching-login-never-retries');
  await page.getByRole('button', { name: 'Recuperar operación pendiente' }).evaluate(button => { button.click(); button.click(); });
  await page.getByText(/No pudimos confirmar el resultado/).waitFor();
  check(posts === 2 && await page.evaluate(key => sessionStorage.getItem(key), key) === raw, 'double-click-single-replay-and-second-loss-retains-pending');
  for (const [label, width, height] of [['escritorio', 1280, 1100], ['movil', 360, 900]]) {
    await page.setViewportSize({ width, height });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}-no-overflow`);
    await page.screenshot({ path: `${out}/recuperacion-${real ? 'real-' : ''}${label}.png`, fullPage: true });
  }
  lost = false;
  await page.getByRole('button', { name: 'Recuperar operación pendiente' }).click();
  const receipt = page.getByRole('region', { name: 'Comprobante de reserva' }); await receipt.waitFor();
  check(posts === 3 && recoveredId === originalId && (await receipt.innerText()).includes(originalId), 'explicit-recovery-same-confirmed-uuid');
  check((await receipt.innerText()).includes('Operación recuperada'), 'recovered-200-label');
  check(await page.evaluate(key => sessionStorage.getItem(key) === null, key), 'valid-recovery-clears-pending');
  check(await page.getByRole('button', { name: 'Recuperar operación pendiente' }).count() === 0, 'recovered-no-resend-control');
  await page.screenshot({ path: `${out}/comprobante-${real ? 'real-' : ''}recuperado.png`, fullPage: true });
  const visible = await page.evaluate(() => JSON.stringify({ session: Object.entries(sessionStorage), local: Object.entries(localStorage), html: document.body.innerHTML }));
  check(!Object.values(identity).some(secret => visible.includes(secret)), 'credentials-not-in-storage-or-page');
}
try {
  await mkdir(out, { recursive: true });
  for (const mode of real ? ['lost-after-commit'] : ['lost-response', 'corrupt', 'storage-denied']) { stage = mode; await scenario(mode); }
  check(runtimeErrors.length === 0, 'no-runtime-errors');
  check(!Object.values(identity).some(secret => JSON.stringify({ logs, urls, results }).includes(secret)), 'no-credentials-in-evidence');
  await writeFile(`${out}/recovery-${real ? 'real' : 'controlled'}.json`, JSON.stringify({ sprint: 'S10', date: new Date().toISOString(), mode: real ? 'exclusive-api-postgresql-response-discarded-after-commit' : 'controlled', browser: browser.version(), passed: true, checks: results.length, results, credentialsRecorded: false }, null, 2));
  console.log(`S10 ${real ? 'real' : 'controlled'}: ${results.length} checks passed`);
} catch (error) { console.error(`S10 failed at ${stage}: ${Object.values(identity).reduce((message, secret) => message.replaceAll(secret, '[redacted]'), error.message).slice(0, 300)}`); process.exitCode = 1; }
finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
