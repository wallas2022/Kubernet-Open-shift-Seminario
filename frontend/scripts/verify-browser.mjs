import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.S01_BROWSER_URL ?? 'http://127.0.0.1:5173';
const output=process.env.S01_EVIDENCE_DIR ?? '.verification';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const responses=[];page.on('response',response=>{if(response.status()>=400)responses.push(response.status());});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('h1').waitFor({state:'visible',timeout:10000});
  await page.screenshot({path:`${output}/pantalla-escritorio.png`,fullPage:true});
  if(errors.length) {await writeFile(`${output}/browser-error.json`,JSON.stringify({errors}));throw new Error('Error de ejecución en la vista inicial');}
  if(await page.title()!=='Reservas del seminario')throw new Error('Título incorrecto');
  if(await page.locator('h1').count()!==1)throw new Error('Título principal ausente');
  if(await page.locator('input').count()!==0)throw new Error('Acceso fuera de alcance S01');
  await page.screenshot({path:`${output}/pantalla-escritorio.png`,fullPage:true});
  await page.setViewportSize({width:360,height:800});
  await page.screenshot({path:`${output}/pantalla-movil.png`,fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow||errors.length||responses.length)throw new Error('La vista inicial presenta errores');
  await writeFile(`${output}/browser.json`,JSON.stringify({sprint:'S01',status:'pass',browser:browser.version(),node:process.version,desktop:'1280x900',mobile:'360x800',runtimeErrors:errors.length,httpErrors:responses.length,horizontalOverflow:overflow,scope:'Vista inicial sin login ni reservas; no acredita RN02 completo'},null,2));
  console.log('Vista inicial verificada en escritorio y móvil.');
} finally {await browser.close();}
