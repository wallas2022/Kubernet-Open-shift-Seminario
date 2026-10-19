import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const real = process.argv.includes('--real');
const credential = real ? JSON.parse(readFileSync(0, 'utf8')).credential : randomBytes(24).toString('hex');
const base = process.env.S07_BROWSER_URL || 'http://127.0.0.1:5180';
const out = process.env.S07_EVIDENCE_DIR || '../evidencias/frontend-s07';
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
const page = await browser.newPage({ viewport:{ width:1280,height:1100 } });
const id='00000000-0000-4000-8000-000000000001';
let available=200, stage='initial', requests=0, posts=0, headersSafe=true;
const results=[], urls=[], logs=[], errors=[];
page.on('console', msg=>logs.push(msg.text()));
page.on('pageerror', ()=>errors.push('runtime-error'));
page.on('request', request=>{
  urls.push(request.url());
  if(new URL(request.url()).pathname.startsWith('/api/')) {
    requests++; if(request.method()==='POST') posts++;
    headersSafe &&= request.method()==='GET' && request.headers()['x-api-key']===credential;
  }
});
if(!real) await page.route(/^https?:\/\/[^/]+\/api\//, route=>route.fulfill({ contentType:'application/json', body:JSON.stringify(
  new URL(route.request().url()).pathname==='/api/catalogo'
    ? { events:[{id,name:'Evento para preparar la cantidad',capacity:1000,available:999}] }
    : {id,capacity:1000,available}) }));
function check(ok,name){if(!ok)throw new Error(name);results.push({name,passed:true});}
const field=()=>page.getByLabel('Cantidad de cupos');
const draft=()=>page.getByRole('region',{name:'Preparación de reserva'});
async function ready(){await page.locator('section[aria-label="Disponibilidad del evento"][aria-busy=false]').waitFor();}
async function review(value){await field().fill(value);await page.getByRole('button',{name:'Revisar cantidad',exact:true}).click();}
try{
  await mkdir(out,{recursive:true});await page.goto(base);
  await page.getByLabel('Clave de laboratorio').fill(credential);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.locator('.event-card').first().getByRole('button',{name:/Consultar disponibilidad/}).click();await ready();
  const initialRequests=requests;
  const stock=Number(await page.locator('.availability-count dd').textContent());
  check(stock>0,'positive-stock-precondition');
  await page.getByRole('button',{name:'Reservar',exact:true}).click();await field().waitFor();
  check(await field().evaluate(node=>document.activeElement===node),'quantity-focus');
  stage='invalid-input';
  for(const value of ['0','101','1.5','abc','true','1e2','01',' 1','+1']){
    await review(value);await page.getByRole('alert').filter({hasText:'Introduce un entero'}).waitFor();
    check(await page.getByRole('heading',{name:'Revisa tu cantidad.',exact:true}).count()===0,`reject-format-${value.trim()||'empty'}`);
  }
  stage='review-one';await review('1');await page.getByRole('heading',{name:'Revisa tu cantidad.',exact:true}).waitFor();
  check(await page.locator('.draft-summary').getByText('1',{exact:true}).count()===1,'accept-one-in-review');
  check(await page.getByRole('heading',{name:'Revisa tu cantidad.',exact:true}).evaluate(node=>document.activeElement===node),'review-heading-focus');
  check(posts===0&&requests===initialRequests,'review-has-no-network-effect');
  const selectedId=await page.locator('.availability-id dd').textContent();
  check(await page.locator('.draft-summary').getByText(selectedId,{exact:true}).count()===1,'review-matches-selected-event');
  await page.getByRole('button',{name:'Volver a editar',exact:true}).click();
  check(await field().inputValue()==='1','back-to-edit-preserves-quantity');
  stage='boundary-review';const amount=stock>=100?'100':'1';await review(amount);
  check(await page.locator('.draft-summary').getByText(amount,{exact:true}).count()===1,'valid-boundary-in-review');
  await page.screenshot({path:`${out}/${real?'pantalla-revision-real':'pantalla-revision'}.png`,fullPage:true});
  await page.getByRole('button',{name:'Confirmar cantidad',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Aún no se ha enviado ninguna reserva'}).waitFor();
  check(await page.getByRole('button',{name:'Enviar reserva',exact:true}).isDisabled()&&posts===0&&requests===initialRequests,'local-confirmation-does-not-send');
  if(!real){
    stage='edit-and-cancel';await page.getByRole('button',{name:'Modificar cantidad',exact:true}).click();
    check(await field().inputValue()===amount,'confirmed-amount-editable');
    await page.getByRole('button',{name:'Cancelar preparación',exact:true}).click();
    check(await draft().count()===0&&posts===0,'cancel-removes-draft-without-send');
    await page.getByRole('button',{name:'Reservar',exact:true}).click();
    check(await field().inputValue()==='1','new-preparation-starts-fresh');
    await review('2');await page.getByRole('heading',{name:'Revisa tu cantidad.',exact:true}).waitFor();
    stage='refresh-invalidates-review';available=1;
    await page.getByRole('button',{name:'Actualizar disponibilidad',exact:true}).click();await ready();
    check(await draft().count()===0,'refresh-removes-previous-review');
    await page.getByRole('button',{name:'Reservar',exact:true}).click();await review('2');
    await page.getByRole('alert').filter({hasText:'supera los cupos'}).waitFor();
    check(await page.getByRole('heading',{name:'Revisa tu cantidad.',exact:true}).count()===0,'insufficient-stock-blocks-review');
    await page.screenshot({path:`${out}/pantalla-cantidad-invalida.png`,fullPage:true});
    await review('1');await page.getByRole('heading',{name:'Revisa tu cantidad.',exact:true}).waitFor();
    for(const [name,width,height] of [['escritorio',1280,1100],['movil',360,900]]){
      await page.setViewportSize({width,height});
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}-no-overflow`);
      await page.screenshot({path:`${out}/pantalla-${name}.png`,fullPage:true});
    }
    stage='zero-stock';available=0;await page.getByRole('button',{name:'Actualizar disponibilidad',exact:true}).click();await ready();
    check(await draft().count()===0&&await page.getByRole('button',{name:'Reservar',exact:true}).isDisabled(),'zero-stock-blocks-preparation');
  }
  const storage=await page.evaluate(()=>JSON.stringify({local:Object.entries(localStorage),session:Object.entries(sessionStorage),cookie:document.cookie,html:document.documentElement.outerHTML}));
  check(headersSafe&&errors.length===0&&!JSON.stringify({logs,urls,storage,results}).includes(credential),'credential-and-runtime-safety');
  await page.reload();await page.getByLabel('Clave de laboratorio').waitFor();
  check(await draft().count()===0,'reload-removes-draft-and-access');
  await writeFile(`${out}/${real?'quantity-real':'quantity-controlled'}.json`,JSON.stringify({sprint:'S07',date:new Date().toISOString(),mode:real?'real-local-api':'intercepted-responses',browser:browser.version(),passed:true,checks:results.length,results,requests,posts,reservationsCreated:0,credentialsRecorded:false},null,2));
  console.log(`S07 ${real?'real API':'controlled'}: ${results.length} checks passed; no POST or credentials recorded.`);
}catch{console.error(`S07 verification failed at stage ${stage}; diagnostic values omitted.`);process.exitCode=1;}
finally{await browser.close();}
