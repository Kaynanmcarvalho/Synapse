export interface RouteMetric {
  readonly method: string;
  readonly route: string;
  readonly status: number;
  readonly count: number;
  readonly errors: number;
  readonly totalDurationMs: number;
  readonly maxDurationMs: number;
}

class HttpMetrics {
  private readonly values = new Map<string, RouteMetric>();
  record(method: string, route: string, status: number, durationMs: number): void {
    const key = `${method}:${route}:${status}`;
    const current = this.values.get(key) ?? {
      method,
      route,
      status,
      count: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
    };
    this.values.set(key, {
      ...current,
      count: current.count + 1,
      errors: current.errors + (status >= 500 ? 1 : 0),
      totalDurationMs: current.totalDurationMs + durationMs,
      maxDurationMs: Math.max(current.maxDurationMs, durationMs),
    });
  }
  snapshot(): readonly RouteMetric[] {
    return [...this.values.values()];
  }
  prometheus(): string {
    const lines = [
      '# HELP synapse_http_requests_total Total de requisições HTTP',
      '# TYPE synapse_http_requests_total counter',
    ];
    for (const value of this.values.values()) {
      const labels = `method="${value.method}",route="${value.route}",status="${value.status}"`;
      lines.push(`synapse_http_requests_total{${labels}} ${value.count}`);
      lines.push(`synapse_http_errors_total{${labels}} ${value.errors}`);
      lines.push(`synapse_http_duration_ms_sum{${labels}} ${value.totalDurationMs}`);
      lines.push(`synapse_http_duration_ms_max{${labels}} ${value.maxDurationMs}`);
    }
    return `${lines.join('\n')}\n`;
  }
  clear(): void {
    this.values.clear();
  }
}

export const httpMetrics = new HttpMetrics();
