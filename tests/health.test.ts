import { describe, expect, it } from 'bun:test';
import { app } from '../server/index';

describe('[FEAT-00] Server Health & ElysiaJS Scaffolding', () => {
  it('should return 200 and healthy status on /api/health', async () => {
    const response = await app.handle(new Request('http://localhost:3001/api/health'));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('wetri-backend');
  });

  it('should return system brand info on /api/v1/config', async () => {
    const response = await app.handle(new Request('http://localhost:3001/api/v1/config'));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.brand).toBe('WETRI.COM');
  });
});
