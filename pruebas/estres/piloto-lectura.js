import http from 'k6/http';
import { Rate } from 'k6/metrics';
const errors = new Rate('technical_errors');
const base = __ENV.BASE_URL || 'http://127.0.0.1:8082';
if (!__ENV.API_KEY) throw new Error('API_KEY es obligatorio');
export const options = {
  scenarios: {
    piloto: {executor:'ramping-arrival-rate',startRate:25,timeUnit:'1s',
      preAllocatedVUs:20,maxVUs:100,
      stages:[{target:50,duration:'10s'},{target:100,duration:'10s'},
        {target:100,duration:'10s'},{target:25,duration:'10s'}]},
  },
  thresholds: {technical_errors:['rate<0.01'],dropped_iterations:['count==0']},
};
export default function () {
  const response=http.get(`${base}/catalogo`,{headers:{'X-Api-Key':__ENV.API_KEY},tags:{name:'catalogo'}});
  errors.add(response.status!==200);
}
export function handleSummary(data) {
  return {[__ENV.RESULT_FILE || 'piloto-lectura-summary.json']:JSON.stringify(data,null,2)};
}
