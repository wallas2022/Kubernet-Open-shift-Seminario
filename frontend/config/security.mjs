const localHosts = new Set(['127.0.0.1', 'localhost', 'host.docker.internal', 'api']);

/** VITE variables become public in Vite. Reject all until a reviewed allowlist is needed. */
export function assertPrivateEnvironment(environment) {
  if (Object.keys(environment).some((key) => key.startsWith('VITE_'))) {
    throw new Error('No se admiten variables VITE_. Las credenciales no son configuración pública.');
  }
}

export function resolveApiTarget(value = 'http://127.0.0.1:8082') {
  let target;
  try { target = new URL(value); }
  catch { throw new Error('Destino local de API inválido.'); }
  if (target.protocol !== 'http:' || !localHosts.has(target.hostname) ||
      target.username || target.password || target.search || target.hash || target.pathname !== '/') {
    throw new Error('El destino de desarrollo debe ser HTTP local, sin credenciales, ruta ni parámetros.');
  }
  return target.origin;
}

/** Do not reflect URLs or headers in responses or logs. Current API operations need no query. */
export function rejectApiQuery(request, response, next) {
  const url = request.url ?? '';
  let path;
  try { path=decodeURIComponent(url.split('?')[0]); }
  catch {response.statusCode=400;response.end();return;}
  if (/(^|\/)\.env(?:[./]|$)/i.test(path)) {
    response.statusCode=404;
    response.setHeader('Content-Type','application/json; charset=utf-8');
    response.end(JSON.stringify({error:'resource_not_available'}));
    return;
  }
  if ((path === '/api' || path.startsWith('/api/')) && url.includes('?')) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'api_query_not_allowed' }));
    return;
  }
  next();
}
