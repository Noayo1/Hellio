/**
 * TDD: Tests written BEFORE implementation.
 * These tests define the expected behavior of ingestion API routes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/index.js';
import pool from '../../src/db.js';

// Mock the LLM module
vi.mock('../../src/ingestion/extractors/bedrock.js', () => ({
  invokeNova: vi.fn(),
}));

import { invokeNova } from '../../src/ingestion/extractors/bedrock.js';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Ingestion Routes', () => {
  let adminToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Seed users for tests
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ['admin@hellio.com', passwordHash, 'Admin', 'admin']
    );
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ['viewer@hellio.com', passwordHash, 'Viewer', 'viewer']
    );

    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });
    adminToken = adminLogin.body.token;

    // Get viewer token
    const viewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@hellio.com', password: TEST_PASSWORD });
    viewerToken = viewerLogin.body.token;

    // Clean up extraction logs
    await pool.query('DELETE FROM extraction_logs');
  });

  afterEach(async () => {
    await pool.query('DELETE FROM extraction_logs');
  });

  describe('POST /api/ingestion/upload', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/ingestion/upload?type=cv')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(401);
    });

    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/ingestion/upload?type=cv')
        .set('Authorization', `Bearer ${viewerToken}`)
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(403);
    });

    it('should require type parameter', async () => {
      const res = await request(app)
        .post('/api/ingestion/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('type');
    });

    it('should process CV upload successfully', async () => {
      vi.mocked(invokeNova).mockResolvedValue({
        text: JSON.stringify({
          name: 'Test User',
          skills: [],
          experience: [],
          education: [],
          certifications: [],
          summary: 'A valid test summary for the user.',
        }),
        durationMs: 100,
      });

      const res = await request(app)
        .post('/api/ingestion/upload?type=cv&dryRun=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('Test CV content'), 'test.txt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.extractionLogId).toBeDefined();
    });
  });

  describe('GET /api/ingestion/logs', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/ingestion/logs');
      expect(res.status).toBe(401);
    });

    it('should return logs list', async () => {
      // Create a test log
      await pool.query(
        `INSERT INTO extraction_logs (source_file_path, source_type, status) VALUES ($1, $2, $3)`,
        ['test.txt', 'cv', 'success']
      );

      const res = await request(app)
        .get('/api/ingestion/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      await pool.query(
        `INSERT INTO extraction_logs (source_file_path, source_type, status) VALUES ($1, $2, $3)`,
        ['test.txt', 'cv', 'failed']
      );

      const res = await request(app)
        .get('/api/ingestion/logs?status=failed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs.every((log: { status: string }) => log.status === 'failed')).toBe(true);
    });
  });

  describe('GET /api/ingestion/logs/:id', () => {
    it('should return log details', async () => {
      const result = await pool.query(
        `INSERT INTO extraction_logs (source_file_path, source_type, status, regex_results)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['test.txt', 'cv', 'success', '{"email":"test@test.com"}']
      );
      const logId = result.rows[0].id;

      const res = await request(app)
        .get(`/api/ingestion/logs/${logId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(logId);
      expect(res.body.regex_results.email).toBe('test@test.com');
    });

    it('should return 404 for non-existent log', async () => {
      const res = await request(app)
        .get('/api/ingestion/logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
