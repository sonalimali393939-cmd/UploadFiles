const request = require('supertest');
const app = require('../server');

describe('Server & Middleware Core Endpoints', () => {
  it('GET / should return 200 with project information and API routes', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.project).toBe("Akatsuki's Draft API");
    expect(res.body.status).toBe('online');
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.endpoints.auth).toBe('/api/auth');
    expect(res.body.endpoints.posts).toBe('/api/posts');
    expect(res.body.endpoints.admin).toBe('/api/admin/posts');
    expect(res.body.endpoints.ai).toBe('/api/ai');
  });

  it('GET /api/health should return 200 with healthy status and uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/unknown-route should return 404 with descriptive JSON', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Not Found/i);
  });
});
