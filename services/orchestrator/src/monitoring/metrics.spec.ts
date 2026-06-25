import { MetricsService } from './metrics.service';

describe('orchestrator metrics', () => {
  it('renders the request counter', async () => {
    const service = new MetricsService();
    service.httpRequests.inc({ method: 'GET', route: '/health', status: '200' });
    const rendered = await service.render();
    expect(rendered).toContain('hnh_http_requests_total');
  });
});
