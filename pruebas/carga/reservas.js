import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

const technicalErrors = new Rate('technical_errors');
const soldOut = new Rate('sold_out');
const base = __ENV.BASE_URL || 'http://127.0.0.1:8082';
const key = __ENV.API_KEY;
const run = __ENV.RUN_ID;
if (!key || !run) throw new Error('API_KEY y RUN_ID son obligatorios');
if (!/^[A-Za-z0-9._:-]{1,80}$/.test(run)) throw new Error('RUN_ID no valido');
const event = '00000000-0000-0000-0000-000000000001';
export const options = {
  scenarios: {
    carga: {executor: 'constant-arrival-rate', rate: Number(__ENV.RATE || 50),
      timeUnit: '1s', duration: __ENV.DURATION || '60s', preAllocatedVUs: 20, maxVUs: 200},
  },
  thresholds: {
    technical_errors: ['rate<0.01'],
    'http_req_duration{operation:read}': ['p(95)<300'],
    'http_req_duration{operation:reserve}': ['p(95)<800'],
    dropped_iterations: ['count==0'],
  },
};
export default function () {
  const i = exec.scenario.iterationInTest;
  const headers = {'X-Api-Key': key};
  let response;
  if (i % 20 < 16) {
    response = http.get(`${base}/catalogo`, {headers, tags: {operation:'read', name:'catalogo'}});
  } else if (i % 20 < 19) {
    response = http.get(`${base}/eventos/${event}/disponibilidad`, {headers, tags:{operation:'read', name:'disponibilidad'}});
  } else {
    headers['Idempotency-Key'] = `${run}-${i}`;
    headers['Content-Type'] = 'application/json';
    response = http.post(`${base}/reservas`, JSON.stringify({event_id:event, quantity:1}),
      {headers, tags:{operation:'reserve', name:'reservas'}, responseCallback:http.expectedStatuses(200,201,409)});
  }
  let stockConflict = false;
  if (response.status === 409) {
    try { stockConflict = response.json('error') === 'sold_out'; } catch (_) { stockConflict = false; }
  }
  const expected = response.status === 200 || response.status === 201 || stockConflict;
  technicalErrors.add(!expected);
  soldOut.add(stockConflict);
  check(response, {'respuesta esperada': () => expected});
}
