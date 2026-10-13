import http from 'k6/http';
import { Rate } from 'k6/metrics';

const errors = new Rate('technical_errors');
const base = __ENV.BASE_URL || 'http://127.0.0.1:8082';
if (!__ENV.API_KEY) throw new Error('API_KEY es obligatorio');
export const options = {
  scenarios: {
    estres: {executor:'ramping-arrival-rate', startRate:50, timeUnit:'1s',
      preAllocatedVUs:30, maxVUs:300,
      stages:[{target:100,duration:'2m'},{target:200,duration:'2m'},
        {target:400,duration:'2m'},{target:600,duration:'2m'},
        {target:100,duration:'2m'}]},
  },
  thresholds:{technical_errors:[{threshold:'rate<0.05',abortOnFail:true,delayAbortEval:'30s'}]},
};
export default function () {
  const response = http.get(`${base}/catalogo`, {headers:{'X-Api-Key':__ENV.API_KEY},tags:{name:'catalogo'}});
  errors.add(response.status !== 200);
}
