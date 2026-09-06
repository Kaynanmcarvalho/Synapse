/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: { concurrent_users: { executor: 'constant-vus', vus: 100, duration: '3m' } },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{name:health}': ['p(95)<250'],
    'http_req_duration{name:products}': ['p(95)<500'],
  },
};
const baseUrl = __ENV.API_URL;
const headers = {
  Authorization: `Bearer ${__ENV.AUTH_TOKEN}`,
  'X-Device-Session': __ENV.DEVICE_SESSION,
};

export default function () {
  const health = http.get(`${baseUrl}/health`, { tags: { name: 'health' } });
  check(health, { 'health responde 200': (response) => response.status === 200 });
  const products = http.get(`${baseUrl}/catalog/products?limit=50`, {
    headers,
    tags: { name: 'products' },
  });
  check(products, { 'produtos responde 200': (response) => response.status === 200 });
  sleep(1);
}
