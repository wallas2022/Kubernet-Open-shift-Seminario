import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readdir, readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';

const secrets=[randomBytes(32).toString('hex'),randomBytes(32).toString('hex')];
const logs=[];const checks=[];
let vite;let upstream;
const check=(condition,name)=>{if(!condition)throw new Error(name);checks.push({name,status:'pass'});};
function run(args,extraEnv={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env:{...process.env,...extraEnv},stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',x=>{output+=x;});child.stderr.on('data',x=>{output+=x;});
    child.on('error',()=>reject(new Error('No se pudo ejecutar la verificación.')));
    child.on('exit',code=>{logs.push(output);resolve({code,output});});
  });
}
async function files(dir) {
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const name=path.join(dir,entry.name);
    if(entry.isDirectory())result.push(...await files(name));else result.push(name);
  }
  return result;
}
async function main() {
  const result=await run(['node_modules/vite/bin/vite.js','build'],{SEMINARIO_PRIVATE_TEST:secrets[0]});
  check(result.code===0,'Compilación sin exposición de variable privada');
  const artifacts=await files('dist');
  for(const file of artifacts) {
    const content=await readFile(file,'utf8');
    check(!secrets.some(secret=>content.includes(secret)||content.includes(Buffer.from(secret).toString('base64'))),`Artefacto limpio ${path.relative('dist',file)}`);
  }
  check(!artifacts.some(file=>file.endsWith('.map')||path.basename(file).startsWith('.env')),'Sin sourcemaps ni archivos de entorno publicados');
  const forbidden=await run(['node_modules/vite/bin/vite.js','build'],{VITE_API_KEY:secrets[1]});
  check(forbidden.code!==0 && forbidden.output.includes('No se admiten variables VITE_'),'Compilación rechaza configuración pública de credenciales');
  const localEnvironment='.env.securitycheck.local';
  await writeFile(localEnvironment,`VITE_API_KEY=${secrets[1]}\n`,{flag:'wx'});
  try {
    const fileCheck=await run(['node_modules/vite/bin/vite.js','build','--mode','securitycheck']);
    check(fileCheck.code!==0 && fileCheck.output.includes('No se admiten variables VITE_'),'Variables públicas en archivo de entorno también rechazadas');
  } finally {await unlink(localEnvironment);}
  let received=false;let safeUrl=true;let rewritten=false;let forwarded=0;
  upstream=createServer((request,response)=>{
    forwarded++;received=request.headers['x-api-key']===secrets[0];
    rewritten=request.url==='/catalogo';
    safeUrl=safeUrl&&!secrets.some(secret=>(request.url??'').includes(secret));
    response.setHeader('Content-Type','application/json');response.end(JSON.stringify({events:[]}));
  });
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const upstreamPort=upstream.address().port;
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5187'],{
    env:{...process.env,DEV_API_TARGET:`http://127.0.0.1:${upstreamPort}`},stdio:['ignore','pipe','pipe'],
  });
  let devLogs='';vite.stdout.on('data',x=>{devLogs+=x;});vite.stderr.on('data',x=>{devLogs+=x;});
  let ready=false;
  for(let i=0;i<100;i++) {
    try {if((await fetch('http://127.0.0.1:5187')).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  check(ready,'Servidor de desarrollo disponible');
  const response=await fetch('http://127.0.0.1:5187/api/catalogo',{headers:{'X-Api-Key':secrets[0]}});
  check(response.ok && received && safeUrl && rewritten,'Proxy transporta clave solo en header y elimina prefijo api');
  const blocked=await fetch(`http://127.0.0.1:5187/api/catalogo?key=${secrets[1]}`);
  const body=await blocked.text();
  check(blocked.status===400 && forwarded===1 && !body.includes(secrets[1]),'Parámetro de API bloqueado sin reflejarlo ni reenviarlo');
  const denied=await fetch('http://127.0.0.1:5187/.env');
  check(denied.status>=400,'Archivos de entorno no servidos');
  vite.kill('SIGTERM');await once(vite,'exit');vite=undefined;logs.push(devLogs);
  check(logs.every(log=>secrets.every(secret=>!log.includes(secret))),'Logs de compilación y desarrollo sin claves de prueba');
  const report={sprint:'S01',requirement:'RN03',status:'pass',scope:'Credenciales aleatorias sintéticas; proxy contra receptor temporal, sin acceso a reservas reales',checks,artifactCount:artifacts.length};
  await mkdir('.verification',{recursive:true});
  await writeFile('.verification/secrets.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,checks:checks.length,artifactCount:artifacts.length}));
}
main().catch(error=>{
  let message=error.message;for(const secret of secrets)message=message.replaceAll(secret,'[REDACTADO]');
  console.error('Verificación RN03 fallida:',message);process.exitCode=1;
}).finally(()=>{vite?.kill('SIGTERM');upstream?.close();});
