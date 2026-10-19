import { chromium } from 'playwright';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const real = process.argv.includes('--real');
const base = process.env.S13_BROWSER_URL || 'http://127.0.0.1:5185';
const out = process.env.S13_EVIDENCE_DIR || '../evidencias/frontend-s13';
let credential = randomBytes(32).toString('hex');
if (real) {
  const text = await readFile('../.runtime/s12/compose.env', 'utf8');
  credential = Object.keys(JSON.parse(text.split(/\r?\n/).find(line => line.startsWith('CLIENT_KEYS_JSON=')).slice(17).replace(/^'|'$/g, '')))[0];
}
const key = 'seminario.reserva.pendiente.v1', event = '00000000-0000-0000-0000-000000000001';
const record = JSON.stringify({ version: 1, eventId: event, quantity: 1, operationKey: 's13-controlled-original', credentialFingerprint: createHash('sha256').update(credential).digest('hex'), startedAt: '2026-10-19T12:00:00Z', state: 'uncertain' });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [], contexts = [], logs = []; let stage = '', posts = 0;
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function subject(mode, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 } }); contexts.push(context);
  await context.addInitScript(({ key, record, mode }) => {
    sessionStorage.setItem('s13-unrelated', 'keep');
    if (['pending', 'corrupt', 'delete-fails'].includes(mode)) sessionStorage.setItem(key, mode === 'corrupt' ? '{broken' : record);
    if (mode === 'delete-fails') {
      const remove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function(name) { if (name !== key) remove.call(this, name); };
    }
  }, { key, record, mode });
  const page = await context.newPage(); page.on('console', message => logs.push(message.text())); page.on('pageerror', error => { throw error; });
  if (!real) await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      posts++;
      if (mode === 'sending') await new Promise(resolve => setTimeout(resolve, 1800));
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: event, event_id: event, quantity: 1, status: 'confirmed', created_at: '2026-10-19T12:00:00Z' }) }).catch(() => {});
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(path === '/api/catalogo' ? { events: [{ id: event, name: 'Salida segura', capacity: 10, available: 10 }] } : { id: event, capacity: 10, available: 10 }) });
  });
  await page.goto(base); await page.getByLabel('Clave de laboratorio').fill(credential); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Salir', exact: true }).waitFor();
  return { page, context };
}
async function cleared(page, label) {
  await page.getByLabel('Clave de laboratorio').waitFor();
  check(await page.getByLabel('Clave de laboratorio').inputValue() === '', `${label}-empty-access-field`);
  check(await page.evaluate(key => sessionStorage.getItem(key), key) === null, `${label}-pending-removed`);
  check(await page.evaluate(() => sessionStorage.getItem('s13-unrelated')) === 'keep', `${label}-unrelated-retained`);
  check(await page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, `${label}-receipt-cleared`);
  check(await page.locator('.event-card').count() === 0, `${label}-catalog-cleared`);
}
try {
  await mkdir(out, { recursive: true });
  if (real) {
    stage = 'real-access-exit'; const { page, context } = await subject('empty');
    await page.locator('.event-card').first().waitFor();
    let lateHeaders = 0; page.on('request', request => { if (request.headers()['x-api-key']) lateHeaders++; });
    await page.getByRole('button', { name: 'Salir', exact: true }).click(); await cleared(page, 'real');
    await page.waitForTimeout(250); check(lateHeaders === 0, 'real-no-authenticated-request-after-exit');
    const response = await context.request.get(`${base}/api/catalogo`, { headers: { 'X-Api-Key': credential } });
    check(response.status() === 200, 'real-exit-does-not-revoke-server-key');
    check(posts === 0, 'real-no-reservation-post');
    await page.screenshot({ path: `${out}/salida-real.png`, fullPage: true });
  } else {
    for (const mobile of [false, true]) {
      stage = `pending-${mobile}`; const { page } = await subject('pending', mobile);
      await page.getByRole('heading', { name: 'Recupera tu operación' }).waitFor();
      await page.getByRole('button', { name: 'Salir', exact: true }).click();
      await page.getByRole('alertdialog').waitFor();
      check(await page.getByRole('button', { name: 'Cancelar salida' }).evaluate(button => button === document.activeElement), `${stage}-cancel-focused`);
      await page.screenshot({ path: `${out}/advertencia-${mobile ? 'movil' : 'escritorio'}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Cancelar salida' }).click();
      check(await page.evaluate(key => sessionStorage.getItem(key), key) === record, `${stage}-cancel-preserves-exact-record`);
      check(await page.getByRole('heading', { name: 'Recupera tu operación' }).isVisible(), `${stage}-cancel-preserves-session`);
      check(await page.getByRole('button', { name: 'Salir', exact: true }).evaluate(button => button === document.activeElement), `${stage}-focus-returned`);
      await page.getByRole('button', { name: 'Salir', exact: true }).click(); await page.keyboard.press('Escape');
      check(await page.getByRole('alertdialog').count() === 0, `${stage}-escape-cancels`);
      await page.getByRole('button', { name: 'Salir', exact: true }).click(); await page.getByRole('button', { name: 'Salir y borrar datos locales' }).click();
      await cleared(page, stage);
      check(posts === 0, `${stage}-no-post`);
    }
    for (const mode of ['empty', 'corrupt', 'accepted', 'sending', 'delete-fails']) {
      stage = mode; const { page } = await subject(mode);
      if (['accepted', 'sending'].includes(mode)) {
        await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
        await page.getByRole('button', { name: 'Reservar', exact: true }).click();
        await page.getByRole('button', { name: 'Revisar cantidad' }).click(); await page.getByRole('button', { name: 'Confirmar cantidad' }).click();
        await page.getByRole('button', { name: 'Enviar reserva', exact: true }).click();
        if (mode === 'accepted') await page.getByRole('region', { name: 'Comprobante de reserva' }).waitFor();
        else await page.getByText('Enviando la reserva. No vuelvas a enviarla.', { exact: true }).waitFor();
      }
      const before = posts;
      await page.getByRole('button', { name: 'Salir', exact: true }).click();
      if (['corrupt', 'sending', 'delete-fails'].includes(mode)) await page.getByRole('button', { name: 'Salir y borrar datos locales' }).click();
      else check(await page.getByRole('alertdialog').count() === 0, `${mode}-no-unnecessary-warning`);
      if (mode === 'delete-fails') {
        await page.getByRole('alert').getByText(/no pudimos verificar el borrado/).waitFor();
        check(await page.evaluate(key => sessionStorage.getItem(key), key) === record, 'failed-cleanup-record-retained');
        check(await page.getByLabel('Clave de laboratorio').isVisible(), 'failed-cleanup-credential-cleared');
        await page.screenshot({ path: `${out}/fallo-almacenamiento.png`, fullPage: true });
      } else await cleared(page, mode);
      if (mode === 'sending') {
        await page.waitForTimeout(2100); await cleared(page, 'late-response');
        await page.screenshot({ path: `${out}/salida-durante-envio.png`, fullPage: true });
      }
      check(posts === before, `${mode}-exit-never-posts`);
    }
  }
  for (const context of contexts) for (const page of context.pages()) {
    const data = await page.evaluate(() => JSON.stringify({ html: document.body.innerHTML, local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
    check(!data.includes(credential), `context-${results.length}-credential-not-persisted`);
    check(!(await page.evaluate(() => location.href)).includes(credential), 'credential-not-in-url');
  }
  check(!JSON.stringify(logs).includes(credential), 'credential-not-in-console');
  await writeFile(`${out}/exit-${real ? 'real' : 'controlled'}.json`, JSON.stringify({ sprint: 'S13', passed: true, mode: real ? 'existing-s12-read-only-api' : 'controlled-browser', date: new Date().toISOString(), browser: browser.version(), checks: results.length, reservationPosts: posts, results, credentialsRecorded: false }, null, 2));
  console.log(`S13 ${real ? 'real' : 'controlled'}: ${results.length} checks passed`);
} catch (error) {
  await mkdir('../documentacion/fase-10/revision/s13-browser', { recursive: true });
  for (const context of contexts) for (const page of context.pages()) await page.screenshot({ path: '../documentacion/fase-10/revision/s13-browser/failure.png', fullPage: true }).catch(() => {});
  console.error(`S13 failed at ${stage}: ${error.message.replaceAll(credential, '[redacted]').slice(0, 350)}`); process.exitCode = 1;
}
finally { await browser.close(); }
