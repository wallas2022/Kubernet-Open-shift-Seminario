import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { assertPrivateEnvironment, resolveApiTarget, rejectApiQuery } from '../config/security.mjs';
import { apiPaths } from '../src/api/paths.ts';

test('a public env variable is rejected without echoing its value', () => {
  const secret=randomBytes(32).toString('hex');
  assert.throws(() => assertPrivateEnvironment({VITE_API_KEY:secret}), error => !error.message.includes(secret));
  assert.doesNotThrow(() => assertPrivateEnvironment({DEV_API_TARGET:'http://127.0.0.1:8082'}));
});
test('proxy rejects credentials, query, paths and external destinations without echoing input', () => {
  const secret=randomBytes(32).toString('hex');
  for(const target of [`http://user:${secret}@localhost:8082`, `http://localhost:8082/?key=${secret}`, 'https://example.com', 'http://localhost:8082/api']) {
    assert.throws(() => resolveApiTarget(target), error => !error.message.includes(secret));
  }
  assert.equal(resolveApiTarget('http://host.docker.internal:8082'),'http://host.docker.internal:8082');
});
test('API path constructors reject injected query, fragments and path traversal', () => {
  for(const id of ['../catalogo','id?api_key=secret','id#secret','not-a-uuid']) {
    assert.throws(() => apiPaths.availability(id));
    assert.throws(() => apiPaths.reservation(id));
  }
  assert.equal(apiPaths.catalog,'/api/catalogo');
  assert.equal(apiPaths.reservation('00000000-0000-0000-0000-000000000001'),'/api/reservas/00000000-0000-0000-0000-000000000001');
});
test('API query middleware blocks the request without reflection or forwarding', () => {
  const secret=randomBytes(32).toString('hex');let forwarded=false;let body='';
  const response={setHeader(){},end(value){body=value;},statusCode:200};
  rejectApiQuery({url:`/api/catalogo?key=${secret}`},response,()=>{forwarded=true;});
  assert.equal(response.statusCode,400);assert.equal(forwarded,false);assert.equal(body.includes(secret),false);
  rejectApiQuery({url:'/api/catalogo'},response,()=>{forwarded=true;});assert.equal(forwarded,true);
});
test('environment paths are denied before SPA fallback, including encoded names', () => {
  for(const url of ['/.env','/.env.local','/%2eenv','/@fs/workspace/frontend/.env.production']) {
    let forwarded=false;
    const response={setHeader(){},end(){},statusCode:200};
    rejectApiQuery({url},response,()=>{forwarded=true;});
    assert.equal(response.statusCode,404);assert.equal(forwarded,false);
  }
});
