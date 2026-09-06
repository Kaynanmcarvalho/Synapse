import { httpMetrics } from './http-metrics';

describe('httpMetrics', () => {
  beforeEach(() => httpMetrics.clear());
  it('agrega latência, volume e taxa de erro sem guardar dados pessoais', () => {
    httpMetrics.record('GET', '/products', 200, 12);
    httpMetrics.record('GET', '/products', 500, 30);
    expect(httpMetrics.snapshot()).toHaveLength(2);
    expect(httpMetrics.prometheus()).toContain('synapse_http_errors_total');
    expect(httpMetrics.prometheus()).toContain('synapse_http_duration_ms_max');
  });
});
