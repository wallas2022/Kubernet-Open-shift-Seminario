import { chromium } from 'playwright';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = process.env.S16_BROWSER_URL || 'http://127.0.0.1:5185';
const out = process.env.S16_EVIDENCE_DIR || '../evidencias/frontend-s16';
const extension = resolve('testing/s16-zoom');
const event = '00000000-0000-0000-0000-000000000001', id = '10000000-0000-4000-8000-000000000016';
const name = 'Seminario internacional de Kubernetes y Red Hat OpenShift ' + 'EventoSinSeparadores'.repeat(5);
const results = [], screens = [], runtime = [];
const baseline = process.argv.includes('--baseline');
const profiles = [{name:'movil',width:360,zoom:1},{name:'escritorio',width:1280,zoom:1},{name:'escritorio-200',width:1280,zoom:2},{name:'movil-200',width:360,zoom:2}].filter(profile=>!process.env.S16_PROFILES || process.env.S16_PROFILES.split(',').includes(profile.name));
function check(ok, name) { results.push({name,passed:!!ok}); if (!ok && !baseline) throw Error(name); }
async function audit(page, profile, screen, capture = false) {
  const metrics = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll('body *')).filter(el => {
      if (el.closest('.skip-link') || !el.getClientRects().length || ['SCRIPT','STYLE'].includes(el.tagName)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.right > width + 1 || rect.left < -1) return true;
      return !['INPUT','TEXTAREA'].includes(el.tagName) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
    }).map(el => ({tag:el.tagName,class:typeof el.className === 'string' ? el.className : '',width:el.clientWidth,scroll:el.scrollWidth})).slice(0,15);
    return {innerWidth, height:innerHeight, width, scroll:document.documentElement.scrollWidth,dpr:devicePixelRatio,offenders};
  });
  screens.push({profile:profile.name,screen,...metrics});
  check(metrics.scroll <= metrics.width + 1, `${profile.name}-${screen}-no-horizontal-scroll`);
  check(metrics.offenders.length === 0, `${profile.name}-${screen}-content-fits`);
  const controls = page.locator('button:visible:not([disabled]),input:visible,a:visible:not(.skip-link)');
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const fits = await control.evaluate(el => {const r=el.getBoundingClientRect();return r.width>0 && r.height>0 && r.left>=-1 && r.right<=document.documentElement.clientWidth+1;});
    check(fits, `${profile.name}-${screen}-control-${await control.getAttribute('type') || await control.evaluate(el=>el.tagName)}`);
  }
  if(capture){
    await page.evaluate(()=>scrollTo(0,0));
    const size=await page.evaluate(()=>({width:innerWidth,height:document.documentElement.scrollHeight}));
    const cdp=await page.context().newCDPSession(page);
    const raw=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width:size.width*profile.zoom,height:size.height*profile.zoom,scale:1}});
    await cdp.detach();
    const png=Buffer.from(raw.data,'base64');
    check(png.readUInt32BE(16)===profile.width,`${profile.name}-${screen}-capture-width`);
    await writeFile(`${out}/${profile.name}-${screen}.png`,png);
  }
}
await mkdir(out,{recursive:true});
let context,stage='setup',browserVersion='';
try {
  for(const profile of profiles){
    stage=profile.name;
    context=await chromium.launchPersistentContext(await mkdtemp('/tmp/s16-browser-'), {channel:'chromium',headless:true,viewport:{width:profile.width,height:1000},args:['--no-sandbox',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
    browserVersion=context.browser().version();
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page=context.pages()[0];page.on('pageerror',error=>runtime.push(error.message));
    let posts=0,catalogMode='normal',readFails=false,uncertain=false;
    await page.route(/^https?:\/\/[^/]+\/api\//,async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;let status=200,body;
      if(req.method()==='POST'){
        posts++;
        if(uncertain){status=503;body={error:'database_unavailable'};}
        else {status=posts===1?201:200;body={id,event_id:event,quantity:2,status:'confirmed',created_at:'2026-10-19T12:00:00Z'};}
      }else if(path==='/api/catalogo'){
        if(catalogMode==='error'){status=503;body={error:'database_unavailable'};}
        else body={events:catalogMode==='empty'?[]:[{id:event,name,capacity:25000,available:25},{id:'00000000-0000-0000-0000-000000000002',name:'Evento breve',capacity:100,available:10}]};
      }else if(path.startsWith('/api/reservas/'))body={id,event_id:event,quantity:2,status:'confirmed',created_at:'2026-10-19T12:00:00Z'};
      else if(readFails){status=503;body={error:'database_unavailable'};}
      else body={id:event,capacity:25000,available:posts?23:25};
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    });
    await page.goto(base);
    const zoom=await worker.evaluate(async ({base,zoom})=>{const tabs=await chrome.tabs.query({});const tab=tabs.find(tab=>tab.url?.startsWith(base));await chrome.tabs.setZoom(tab.id,zoom);return chrome.tabs.getZoom(tab.id);},{base,zoom:profile.zoom});
    await page.waitForFunction(expected=>Math.abs(innerWidth-expected)<=1,profile.width/profile.zoom);
    check(zoom===profile.zoom,`${profile.name}-native-tab-zoom`);
    check(await page.evaluate(()=>getComputedStyle(document.documentElement).zoom)==='1',`${profile.name}-no-css-zoom-substitute`);
    await audit(page,profile,'P01',true);
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.getByText(/Introduce una clave no vacía/).waitFor();await audit(page,profile,'P01-error');
    await page.getByLabel('Clave de laboratorio').fill('s16-synthetic-key');await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.locator('.event-card').first().waitFor();await audit(page,profile,'P02',true);
    catalogMode='empty';await page.getByRole('button',{name:'Actualizar catálogo',exact:true}).click();await page.getByRole('heading',{name:'No hay eventos disponibles'}).waitFor();await audit(page,profile,'P02-vacio');
    catalogMode='error';await page.getByRole('button',{name:'Actualizar catálogo',exact:true}).click();await page.getByText('Información desactualizada.',{exact:true}).waitFor();await audit(page,profile,'P02-error');
    catalogMode='normal';await page.getByRole('button',{name:'Actualizar catálogo',exact:true}).click();await page.locator('.event-card').first().waitFor();
    await page.locator('.event-card').first().getByRole('button').click();await page.locator('.availability-count').waitFor();await audit(page,profile,'P03-disponibilidad');
    await page.getByRole('button',{name:'Reservar',exact:true}).click();await page.getByLabel('Cantidad de cupos').fill('0');await page.getByRole('button',{name:'Revisar cantidad'}).click();await page.getByText(/Introduce un entero/).waitFor();await audit(page,profile,'P03-error');
    await page.getByLabel('Cantidad de cupos').fill('2');await page.getByRole('button',{name:'Revisar cantidad'}).click();await audit(page,profile,'P03-revision',true);
    await page.getByRole('button',{name:'Confirmar cantidad'}).click();await page.getByRole('button',{name:'Enviar reserva',exact:true}).click();
    await page.getByRole('region',{name:'Comprobante de reserva'}).waitFor();await audit(page,profile,'P04',true);
    check(await page.getByLabel('Identificador para copiar').inputValue()===id,`${profile.name}-full-uuid-retained`);
    readFails=true;await page.getByRole('button',{name:'Actualizar disponibilidad',exact:true}).click();await page.getByText('Disponibilidad desactualizada.',{exact:true}).waitFor();await audit(page,profile,'P04-error');
    await page.getByRole('button',{name:'← Volver al catálogo'}).click();await page.getByRole('button',{name:'Consultar una reserva',exact:true}).click();
    await page.getByLabel('Identificador de reserva',{exact:true}).fill('no-valido');await page.getByRole('button',{name:'Consultar reserva',exact:true}).click();await page.getByText(/Introduce el identificador completo/).waitFor();await audit(page,profile,'P05-error');
    await page.getByLabel('Identificador de reserva',{exact:true}).fill(id);await page.getByRole('button',{name:'Consultar reserva',exact:true}).click();await page.getByRole('region',{name:'Comprobante de reserva'}).waitFor();await audit(page,profile,'P05',true);
    check(posts===1,`${profile.name}-no-layout-replay`);
    await page.getByRole('button',{name:'Salir',exact:true}).click();
    await page.getByLabel('Clave de laboratorio').fill('s16-synthetic-key');await page.getByRole('button',{name:'Entrar',exact:true}).click();
    readFails=false;uncertain=true;await page.locator('.event-card').first().getByRole('button').click();await page.getByRole('button',{name:'Reservar',exact:true}).click();await page.getByLabel('Cantidad de cupos').fill('2');
    for(const label of ['Revisar cantidad','Confirmar cantidad','Enviar reserva'])await page.getByRole('button',{name:label,exact:true}).click();
    await page.getByText(/No pudimos confirmar el resultado/).waitFor();await page.reload();
    await page.getByLabel('Clave de laboratorio').fill('s16-synthetic-key');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Recupera tu operación'}).waitFor();await audit(page,profile,'P06',true);
    await page.getByRole('button',{name:'Salir',exact:true}).click();await page.getByRole('alertdialog').waitFor();await audit(page,profile,'salida',true);
    await page.getByRole('button',{name:'Cancelar salida'}).click();uncertain=false;await page.getByRole('button',{name:'Recuperar operación pendiente'}).click();await page.getByRole('region',{name:'Comprobante de reserva'}).waitFor();await audit(page,profile,'P06-comprobante');
    check(posts===3,`${profile.name}-only-explicit-posts`);
    await context.close();context=null;
  }
  check(runtime.length===0,'no-runtime-errors');
  const failures=results.filter(result=>!result.passed);
  await writeFile(`${out}/${baseline?'baseline':'responsive-controlled'}.json`,JSON.stringify({sprint:'S16',browser:browserVersion,profiles,mode:'controlled-business-fixtures',zoomMethod:'chrome.tabs.setZoom and getZoom in isolated persistent browser',passed:failures.length===0,checks:results.length,failures:failures.length,results,screens},null,2));
  console.log(`S16 ${baseline?'baseline':'final'}: ${results.length} checks, ${failures.length} failures; ${screens.length} screen states`);
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({stage,error:error.message,screens,results},null,2));throw error;}
finally{if(context)await context.close();}
