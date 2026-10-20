import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.S15_BROWSER_URL || 'http://127.0.0.1:5185';
const out = process.env.S15_EVIDENCE_DIR || '../evidencias/frontend-s15';
const event = '00000000-0000-0000-0000-000000000001', id = '10000000-0000-4000-8000-000000000015';
const credential = 's15-synthetic-key', key = 'seminario.reserva.pendiente.v1';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [], traversal = [], errors = [];
let stage = 'setup';
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
async function reach(page, target, label) {
  await target.waitFor({ state: 'visible' });
  for (let tabs = 0; tabs < 65; tabs++) {
    if (await target.evaluate(el => el === document.activeElement)) { traversal.push({ label, tabs }); return; }
    await page.keyboard.press('Tab');
  }
  throw Error(`Unreachable by Tab: ${label}`);
}
async function activate(page, name, keyboard = 'Enter') {
  const target = page.getByRole('button', { name, exact: true });
  await reach(page, target, name); await page.keyboard.press(keyboard);
}
async function input(page, label, value) {
  await reach(page, page.getByLabel(label, { exact: true }), label);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(value);
}
async function audit(page, screen) {
  const unnamed = await page.locator('button,input:not([type=hidden]),a[href]').evaluateAll(nodes => nodes.filter(el => {
    if (!el.getClientRects().length) return false;
    const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const name = el.getAttribute('aria-label') || ids.map(id => document.getElementById(id)?.textContent || '').join(' ') ||
      (el.labels ? Array.from(el.labels).map(label => label.textContent).join(' ') : '') || (el.tagName !== 'INPUT' ? el.textContent : '');
    return !name.trim();
  }).map(el => el.tagName));
  check(unnamed.length === 0, `${screen}-controls-named`);
  check(await page.locator('[tabindex]').evaluateAll(nodes => nodes.every(el => Number(el.getAttribute('tabindex')) <= 0)), `${screen}-no-positive-tabindex`);
  check(await page.locator('html').getAttribute('lang') === 'es', `${screen}-spanish-language`);
  const text = await page.locator('body').innerText();
  check(!/habilitarán próximamente|próximas entregas|La API rechazó|· S\d\d/.test(text), `${screen}-current-spanish-copy`);
}
await mkdir(out, { recursive: true });
try {
  for (const mode of ['complete', 'recovery', 'discard']) {
    stage = mode;
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    let posts = 0, loginDenied = mode === 'complete', catalogFail = false, wire;
    await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      let status = 200, body;
      if (req.method() === 'POST') {
        posts++;
        const sent = { key: req.headers()['idempotency-key'], body: req.postDataJSON() };
        if (!wire) wire = sent; else check(JSON.stringify(sent) === JSON.stringify(wire), 'CU04-original-key-and-payload');
        if (mode !== 'complete' && posts === 1) { status = 503; body = { error: 'database_unavailable' }; }
        else { status = mode === 'recovery' ? 200 : 201; body = { id, event_id: event, quantity: 2, status: 'confirmed', created_at: '2026-10-19T12:00:00Z' }; }
      } else if (path === '/api/catalogo') {
        if (loginDenied) { status = 401; body = { error: 'invalid_credentials' }; }
        else if (catalogFail) { status = 503; body = { error: 'database_unavailable' }; }
        else body = { events: [{ id: event, name: 'Evento de teclado', capacity: 25, available: 25 }] };
      } else if (path.startsWith('/api/reservas/')) body = { id, event_id: event, quantity: 2, status: 'confirmed', created_at: '2026-10-19T12:00:00Z' };
      else body = { id: event, capacity: 25, available: posts ? 23 : 25 };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(base); await audit(page, `${mode}-P01`);
    if (mode === 'complete') {
      await reach(page, page.getByRole('link', { name: 'Ir al contenido' }), 'skip-link');
      await page.keyboard.press('Enter');
      check(await page.locator('#contenido').evaluate(el => document.activeElement === el), 'skip-link-focuses-main');
      await activate(page, 'Entrar');
      await page.getByText(/Introduce una clave no vacía/).waitFor();
      check(await page.getByLabel('Clave de laboratorio').evaluate(el => document.activeElement === el), 'CU01-empty-error-focus');
      await input(page, 'Clave de laboratorio', credential); await page.keyboard.press('Enter');
      await page.getByText(/La clave no es válida/).waitFor();
      check(await page.getByLabel('Clave de laboratorio').inputValue() === '', 'CU01-rejected-key-cleared');
      loginDenied = false;
    }
    await input(page, 'Clave de laboratorio', credential); await page.keyboard.press('Enter');
    await page.locator('.event-card').waitFor(); await audit(page, `${mode}-P02`);
    if (mode === 'complete') {
      catalogFail = true; await activate(page, 'Actualizar catálogo', 'Space');
      await page.getByRole('alert').getByText('Información desactualizada.').waitFor();
      await audit(page, 'P02-read-error'); catalogFail = false;
      await activate(page, 'Actualizar catálogo');
      await page.locator('section[aria-label="Catálogo de eventos"][aria-busy=false]').waitFor();
    }
    await reach(page, page.getByRole('button', { name: 'Consultar disponibilidad de Evento de teclado' }), 'event');
    await page.keyboard.press('Enter'); await page.locator('.availability-count').waitFor();
    await activate(page, 'Actualizar disponibilidad', 'Space');
    await page.locator('section[aria-label="Disponibilidad del evento"][aria-busy=false]').waitFor();
    await audit(page, `${mode}-P03-availability`);
    await activate(page, 'Reservar');
    if (mode === 'complete') { await activate(page, 'Cancelar preparación', 'Space'); await activate(page, 'Reservar'); }
    await audit(page, `${mode}-P03-quantity`);
    if (mode === 'complete') {
      await input(page, 'Cantidad de cupos', '0'); await page.keyboard.press('Enter');
      await page.getByText(/Introduce un entero/).waitFor();
      check(await page.getByLabel('Cantidad de cupos').evaluate(el => document.activeElement === el), 'CU03-invalid-quantity-focus');
      await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      check(await page.getByLabel('Cantidad de cupos').evaluate(el => document.activeElement === el), 'CU03-reverse-tab');
    }
    await input(page, 'Cantidad de cupos', '2'); await page.keyboard.press('Enter');
    await audit(page, `${mode}-P03-review`);
    if (mode === 'complete') { await activate(page, 'Volver a editar', 'Space'); await input(page, 'Cantidad de cupos', '2'); await page.keyboard.press('Enter'); }
    await activate(page, 'Confirmar cantidad', 'Space');
    await audit(page, `${mode}-P03-confirm`);
    check(posts === 0, `${mode}-no-post-before-explicit-send`);
    await activate(page, 'Enviar reserva');
    if (mode !== 'complete') {
      await page.getByText(/No pudimos confirmar el resultado/).waitFor();
      await audit(page, 'P03-uncertain');
      const pending = await page.evaluate(key => sessionStorage.getItem(key), key);
      await activate(page, 'Salir'); await audit(page, 'P06-exit-warning');
      check(await page.getByRole('button', { name: 'Cancelar salida' }).evaluate(el => document.activeElement === el), 'CU06-warning-cancel-focus');
      await page.keyboard.press('Escape');
      check(await page.getByRole('button', { name: 'Salir', exact: true }).evaluate(el => document.activeElement === el), 'CU06-escape-returns-trigger');
      check(await page.evaluate(key => sessionStorage.getItem(key), key) === pending, 'CU06-cancel-keeps-original-pending');
      await activate(page, 'Salir'); await activate(page, 'Cancelar salida', 'Space');
      check(await page.evaluate(key => sessionStorage.getItem(key), key) === pending, `${mode}-cancel-button-keeps-pending`);
      if (mode === 'discard') {
        await activate(page, 'Salir');
        await page.screenshot({ path: `${out}/salida-pendiente-teclado.png`, fullPage: true });
        await activate(page, 'Salir y borrar datos locales', 'Space');
        await page.getByLabel('Clave de laboratorio').waitFor();
        check(await page.evaluate(key => sessionStorage.getItem(key), key) === null, 'CU06-keyboard-confirm-clears-pending');
        check(posts === 1, 'CU06-keyboard-exit-no-post');
        await audit(page, 'P01-after-discard');
        await context.close(); continue;
      }
      await page.reload(); await input(page, 'Clave de laboratorio', credential); await page.keyboard.press('Enter');
      await page.getByRole('heading', { name: 'Recupera tu operación' }).waitFor();
      await audit(page, 'P06-recovery'); check(posts === 1, 'CU04-login-does-not-replay');
      await activate(page, 'Recuperar operación pendiente', 'Space');
    }
    const receipt = page.getByRole('region', { name: 'Comprobante de reserva' }); await receipt.waitFor();
    await audit(page, `${mode}-P04`);
    check(await page.getByLabel('Identificador para copiar').inputValue() === id, `${mode}-receipt-uuid`);
    await reach(page, page.getByLabel('Identificador para copiar'), 'manual-copy');
    check(await page.getByLabel('Identificador para copiar').evaluate(el => el.selectionEnd - el.selectionStart === el.value.length), `${mode}-manual-copy-keyboard`);
    if (mode === 'complete') {
      await activate(page, '← Volver al catálogo'); await activate(page, 'Consultar una reserva');
      await audit(page, 'P05-lookup');
      await input(page, 'Identificador de reserva', 'incorrecto'); await page.keyboard.press('Enter');
      await page.getByText(/Introduce el identificador completo/).waitFor();
      await input(page, 'Identificador de reserva', id); await page.keyboard.press('Enter');
      await receipt.waitFor(); await audit(page, 'P05-confirmed');
      await page.screenshot({ path: `${out}/consulta-teclado.png`, fullPage: true });
    } else await page.screenshot({ path: `${out}/recuperacion-teclado.png`, fullPage: true });
    await activate(page, 'Salir', 'Space');
    await page.getByLabel('Clave de laboratorio').waitFor();
    check(await page.getByRole('region', { name: 'Comprobante de reserva' }).count() === 0, `${mode}-CU06-receipt-cleared`);
    check(await page.evaluate(key => sessionStorage.getItem(key), key) === null, `${mode}-CU06-pending-cleared`);
    check(posts === (mode === 'complete' ? 1 : 2), `${mode}-expected-post-count`);
    await context.close();
  }
  check(errors.length === 0, 'no-browser-runtime-errors');
  await writeFile(`${out}/keyboard-controlled.json`, JSON.stringify({ sprint: 'S15', mode: 'controlled-business-fixtures', keyboardOnly: true, passed: true, checks: results.length, browser: browser.version(), results, traversal }, null, 2));
  console.log(`S15: ${results.length} checks passed; ${traversal.length} keyboard traversals`);
} catch (error) {
  await writeFile(`${out}/failure.json`, JSON.stringify({ stage, error: error.message, completedChecks: results.length }, null, 2));
  throw error;
} finally { await browser.close(); }
