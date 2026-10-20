import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { inspectAccessibility } from '../testing/accessibility-audit.mjs';
const base=process.env.S17_BROWSER_URL||'http://127.0.0.1:5185',out=process.env.S17_EVIDENCE_DIR||'../evidencias/frontend-s17';
const event='00000000-0000-0000-0000-000000000001',id='10000000-0000-4000-8000-000000000017';
const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:1000}});
const results=[],audits=[];let stage='setup',delay='',release,lookupStatus=503,availabilityStatus=200,posts=0,lookups=0;
function check(ok,name){if(!ok)throw Error(name);results.push({name,passed:true});}
async function live(selector,text,label){
  const p=page.locator(selector).filter({hasText:text});await p.waitFor();
  check(await p.evaluate(el=>!el.closest('[aria-busy=true]')),`${label}-outside-busy`);
  const cdp=await page.context().newCDPSession(page),tree=await cdp.send('Accessibility.getFullAXTree');await cdp.detach();
  const byId=new Map(tree.nodes.map(n=>[n.nodeId,n]));
  const content=node=>[node.name?.value||'',...(node.childIds||[]).map(key=>content(byId.get(key)))].join(' ');
  check(tree.nodes.some(n=>n.role?.value==='status'&&n.properties?.some(p=>p.name==='live'&&p.value?.value==='polite')&&content(n).includes(text)),`${label}-AX-polite-status`);
}
async function focused(locator,label){check(await locator.evaluate(el=>el===document.activeElement),label);}
await mkdir(out,{recursive:true});
try{
  await page.route(/^https?:\/\/[^/]+\/api\//,async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    const kind=req.method()==='POST'?'post':path.startsWith('/api/reservas/')?'lookup':path==='/api/catalogo'?'catalog':'availability';
    if(delay===kind){delay='';await new Promise(resolve=>{release=resolve;});}
    let status=200,body;
    if(kind==='post'){posts++;status=201;body={id,event_id:event,quantity:2,status:'confirmed',created_at:'2026-10-19T12:00:00Z'};}
    else if(kind==='catalog')body={events:[{id:event,name:'Seminario accesible',capacity:25,available:25}]};
    else if(kind==='lookup'){lookups++;status=lookupStatus;body={error:'database_unavailable'};}
    else{status=availabilityStatus;body=status===401?{error:'invalid_credentials'}:{id:event,capacity:25,available:posts?23:25};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base);await focused(page.getByRole('heading',{name:'Accede al laboratorio.'}),'P01-initial-focus');
  stage='login-wait';delay='catalog';await page.getByLabel('Clave de laboratorio').fill('s17-synthetic-key');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await live('.access-status','Comprobando tu acceso al laboratorio.','P01-wait');audits.push(await inspectAccessibility(page,'espera-acceso',out));release();
  await page.locator('.event-card').waitFor();await focused(page.locator('h1'),'P02-navigation-focus');
  stage='refresh-wait';delay='catalog';await page.getByRole('button',{name:'Actualizar catálogo'}).click();await live('.catalog-meta [role=status]','Actualizando el catálogo.','P02-wait');release();
  await page.locator('section[aria-label="Catálogo de eventos"][aria-busy=false]').waitFor();await focused(page.locator('h1'),'P02-refresh-focus-restored');
  await page.locator('.event-card').getByRole('button').click();await page.locator('.availability-count').waitFor();await focused(page.locator('h1'),'P03-navigation-focus');
  await page.getByRole('button',{name:'Reservar',exact:true}).click();await page.getByLabel('Cantidad de cupos').fill('0');await page.getByRole('button',{name:'Revisar cantidad'}).click();
  const quantity=page.getByLabel('Cantidad de cupos');await focused(quantity,'P03-validation-focus');check(await quantity.getAttribute('aria-errormessage')==='quantity-error','P03-error-reference');audits.push(await inspectAccessibility(page,'error-cantidad',out));
  await quantity.fill('2');await page.getByRole('button',{name:'Revisar cantidad'}).click();await focused(page.getByRole('heading',{name:'Revisa tu cantidad.'}),'P03-review-focus');
  await page.getByRole('button',{name:'Confirmar cantidad'}).click();stage='post-wait';delay='post';await page.getByRole('button',{name:'Enviar reserva',exact:true}).click();await live('section[aria-label="Estado de envío"] [role=status]','Enviando la reserva.','P03-send-wait');audits.push(await inspectAccessibility(page,'espera-envio',out));release();
  const receiptHeading=page.getByRole('heading',{name:'Comprobante de reserva'});await receiptHeading.waitFor();await focused(receiptHeading,'P04-confirmation-focus');
  const summary=await receiptHeading.getAttribute('aria-describedby');check(summary&&await page.locator(`[id="${summary}"]`).innerText()==='Reserva creada y confirmada.','P04-confirmation-description');
  await page.keyboard.press('Tab');const copy=page.getByLabel('Identificador para copiar');await focused(copy,'P04-next-control');
  check(await copy.evaluate(el=>el.matches(':focus-visible')&&parseFloat(getComputedStyle(el).outlineWidth)>=2),'P04-visible-keyboard-focus');
  await page.screenshot({path:`${out}/foco-comprobante.png`,fullPage:true});
  await page.getByRole('button',{name:'← Volver al catálogo'}).click();await page.getByRole('button',{name:'Consultar una reserva',exact:true}).click();const identifier=page.getByLabel('Identificador de reserva',{exact:true});await focused(identifier,'P05-navigation-focus');
  await identifier.fill('incorrecto');await page.getByRole('button',{name:'Consultar reserva',exact:true}).click();check(lookups===0,'P05-invalid-uuid-not-sent');
  await identifier.fill(id);delay='lookup';stage='lookup-wait';await page.getByRole('button',{name:'Consultar reserva',exact:true}).click();await live('.access-panel > [role=status]','Consultando la reserva autorizada.','P05-wait');release();
  await page.getByRole('alert').waitFor();await focused(identifier,'P05-http-error-focus');audits.push(await inspectAccessibility(page,'error-consulta',out));
  await page.screenshot({path:`${out}/error-asociado.png`,fullPage:true});
  stage='expired-session';await page.getByRole('button',{name:'← Volver al catálogo'}).click();availabilityStatus=401;await page.locator('.event-card').getByRole('button').click();await page.getByText(/El acceso ya no está autorizado/).waitFor();
  await focused(page.getByRole('heading',{name:'Accede al laboratorio.'}),'P01-expired-focus');check((await page.getByLabel('Clave de laboratorio').getAttribute('aria-describedby')).includes('access-notice'),'P01-expired-field-description');audits.push(await inspectAccessibility(page,'acceso-caducado',out));
  check(posts===1,'no-accessibility-side-effect-post');
  await writeFile(`${out}/announcements-controlled.json`,JSON.stringify({sprint:'S17',passed:true,mode:'controlled-business-fixtures',checks:results.length,browser:browser.version(),results,audits,readerTest:'pending-native-reader-listening'},null,2));console.log(`S17 focused: ${results.length} checks passed`);
}catch(error){await writeFile(`${out}/focus-failure.json`,JSON.stringify({stage,error:error.message},null,2));throw error;}
finally{await browser.close();}
