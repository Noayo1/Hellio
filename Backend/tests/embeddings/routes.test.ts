import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Embeddings API', () => {
  let authToken: string | undefined;

  beforeAll(async () => {
    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hellio.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      });
    authToken = loginRes.body.token;
  });

  describe('GET /api/positions/:id/suggest-candidates', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/positions/test-id/suggest-candidates');
      expect(res.status).toBe(401);
    });

    it('should return suggestions array for valid position', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const positionsRes = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`);

      const positions = positionsRes.body || [];
      if (positions.length === 0) {
        console.log('Skipping: No positions in database');
        return;
      }

      const positionId = positions[0].id;

      const res = await request(app)
        .get(`/api/positions/${positionId}/suggest-candidates`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });

    it('should return empty array for non-existent position', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const res = await request(app)
        .get('/api/positions/non-existent-id/suggest-candidates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });
  });

  describe('GET /api/candidates/:id/suggest-positions', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/candidates/test-id/suggest-positions');
      expect(res.status).toBe(401);
    });

    it('should return suggestions array for valid candidate', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const candidatesRes = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${authToken}`);

      const candidates = candidatesRes.body || [];
      if (candidates.length === 0) {
        console.log('Skipping: No candidates in database');
        return;
      }

      const candidateId = candidates[0].id;

      const res = await request(app)
        .get(`/api/candidates/${candidateId}/suggest-positions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });

    it('should return empty array for non-existent candidate', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const res = await request(app)
        .get('/api/candidates/non-existent-id/suggest-positions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('should accept explain query parameter', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const candidatesRes = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${authToken}`);

      const candidates = candidatesRes.body || [];
      if (candidates.length === 0) {
        console.log('Skipping: No candidates in database');
        return;
      }

      const candidateId = candidates[0].id;

      const res = await request(app)
        .get(`/api/candidates/${candidateId}/suggest-positions?explain=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
    });
  });
});
