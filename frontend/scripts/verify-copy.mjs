import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = '../evidencias/frontend-s14', base = process.env.S14_BROWSER_URL || 'http://127.0.0.1:5185';
const event = '00000000-0000-0000-0000-000000000001', id = '10000000-0000-4000-8000-000000000014';
const results = [];
function check(ok, name) { if (!ok) throw Error(name); results.push({ name, passed: true }); }
const browser = await chromium.launch({ args: ['--no-sandbox'] });
await mkdir(out, { recursive: true });
try {
  for (const mode of ['native', 'created', 'repeat', 'denied', 'missing', 'refresh-fails', 'not-found']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    if (mode === 'native') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await context.addInitScript(mode => {
      if (mode === 'native') return;
      Object.defineProperty(navigator, 'clipboard', { value: mode === 'missing' ? undefined : { writeText: async text => {
        if (mode === 'denied') throw Error('denied'); window.copiedIdentifier = text;
      } } });
    }, mode);
    const page = await context.newPage(); let posts = 0, reads = 0;
    await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
      const path = new URL(route.request().url()).pathname;
      let status = 200, body;
      if (route.request().method() === 'POST') { posts++; status = mode === 'repeat' ? 200 : 201; body = { id, event_id: event, quantity: 2, status: 'confirmed', created_at: '2026-10-19T12:00:00Z' }; }
      else if (path === '/api/catalogo') body = { events: [{ id: event, name: 'Evento S14', capacity: 25, available: 25 }] };
      else {
        reads++;
        if (posts && ['refresh-fails', 'not-found'].includes(mode)) { status = mode === 'not-found' ? 404 : 503; body = { error: mode === 'not-found' ? 'event_not_found' : 'database_unavailable' }; }
        else body = { id: event, capacity: 25, available: posts ? 23 : 25 };
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(base);
    await page.getByLabel('Clave de laboratorio').fill('s14-synthetic-credential');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.locator('.event-card').first().getByRole('button', { name: /Consultar disponibilidad/ }).click();
    await page.getByRole('button', { name: 'Reservar', exact: true }).click();
    await page.getByLabel('Cantidad de cupos').fill('2');
    for (const name of ['Revisar cantidad', 'Confirmar cantidad', 'Enviar reserva']) await page.getByRole('button', { name, exact: true }).click();
    const receipt = page.getByRole('region', { name: 'Comprobante de reserva' }); await receipt.waitFor();
    if (['refresh-fails', 'not-found'].includes(mode)) await page.getByRole('alert').filter({ hasText: mode === 'not-found' ? 'Evento no disponible' : 'Disponibilidad desactualizada' }).waitFor();
    else await page.locator('.availability-count dd').filter({ hasText: /^23$/ }).waitFor();
    check(reads === 2, `${mode}-one-automatic-refresh`);
    check(await receipt.isVisible(), `${mode}-receipt-preserved`);
    await receipt.getByRole('button', { name: 'Copiar identificador' }).click();
    if (['denied', 'missing'].includes(mode)) {
      await receipt.getByText(/No pudimos copiar automáticamente/).waitFor();
      check(await page.getByLabel('Identificador para copiar').evaluate(el => document.activeElement === el && el.value.substring(el.selectionStart, el.selectionEnd) === el.value), `${mode}-manual-selection-exact`);
    } else {
      await receipt.getByText('Identificador copiado.', { exact: true }).waitFor();
      check(await page.evaluate(mode => mode === 'native' ? navigator.clipboard.readText() : window.copiedIdentifier, mode) === id, `${mode}-clipboard-exact`);
    }
    check(posts === 1, `${mode}-no-extra-post`);
    await page.getByRole('button', { name: 'Actualizar disponibilidad', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('section[aria-label="Disponibilidad del evento"]').matches('[aria-busy="true"]'));
    check(posts === 1 && await receipt.isVisible(), `${mode}-manual-refresh-preserves-receipt`);
    if (mode === 'missing') { await page.setViewportSize({ width: 360, height: 900 }); await page.screenshot({ path: `${out}/copia-manual-movil.png`, fullPage: true }); }
    if (mode === 'refresh-fails') await page.screenshot({ path: `${out}/comprobante-error-cupos.png`, fullPage: true });
    await context.close();
  }
  for (const mode of ['recovery', 'recovery-fails', 'lookup']) {
    const context = await browser.newContext();
    if (mode !== 'lookup') await context.addInitScript(async ({ event }) => {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('s14-synthetic-credential'));
      const fingerprint = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('seminario.reserva.pendiente.v1', JSON.stringify({ version: 1, eventId: event, quantity: 2, operationKey: 's14-recovered-original', credentialFingerprint: fingerprint, startedAt: '2026-10-19T12:00:00Z', state: 'uncertain' }));
    }, { event });
    const page = await context.newPage(); let posts = 0, reads = 0;
    await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
      const path = new URL(route.request().url()).pathname;
      let status = 200, body;
      if (route.request().method() === 'POST' || path === `/api/reservas/${id}`) {
        if (route.request().method() === 'POST') posts++;
        body = { id, event_id: event, quantity: 2, status: 'confirmed', created_at: '2026-10-19T12:00:00Z' };
      } else if (path === '/api/catalogo') body = { events: [{ id: event, name: 'Evento S14', capacity: 25, available: 23 }] };
      else { reads++; status = mode === 'recovery-fails' ? 503 : 200; body = status === 200 ? { id: event, capacity: 25, available: 23 } : { error: 'database_unavailable' }; }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(base);
    await page.getByLabel('Clave de laboratorio').fill('s14-synthetic-credential');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    if (mode === 'lookup') {
      await page.getByRole('button', { name: 'Consultar una reserva por UUID' }).click();
      await page.getByLabel('Identificador de reserva', { exact: true }).fill(id);
      await page.getByRole('button', { name: 'Consultar reserva', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Recuperar operación pendiente' }).click();
      await page.getByText(mode === 'recovery-fails' ? /No pudimos actualizar los cupos. Tu reserva sigue confirmada/ : /Cupos disponibles después de confirmar: 23/).waitFor();
      check(reads === 1, `${mode}-one-refresh`);
    }
    const receipt = page.getByRole('region', { name: 'Comprobante de reserva' }); await receipt.waitFor();
    check(await receipt.getByLabel('Identificador para copiar').inputValue() === id, `${mode}-exact-identifier`);
    check(await receipt.getByRole('button', { name: 'Copiar identificador' }).isVisible(), `${mode}-copy-action`);
    check(posts === (mode === 'lookup' ? 0 : 1), `${mode}-no-additional-post`);
    await context.close();
  }
  await writeFile(`${out}/copy-controlled.json`, JSON.stringify({ sprint: 'S14', mode: 'controlled', passed: true, checks: results.length, browser: browser.version(), results }, null, 2));
  console.log(`S14: ${results.length} checks passed`);
} finally { await browser.close(); }
