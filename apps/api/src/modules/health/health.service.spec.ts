import { HealthService } from './health.service';

describe('HealthService', () => {
  it('responde ok com o nome do servico e um timestamp ISO', () => {
    const report = new HealthService().check();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('synapse-api');
    expect(new Date(report.timestamp).toString()).not.toBe('Invalid Date');
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
