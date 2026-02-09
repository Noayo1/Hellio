import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Files API', () => {
  let authToken: string;
  let testFileId: string;

  beforeEach(async () => {
    // Seed admin user
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)`,
      ['admin@hellio.com', passwordHash, 'Admin']
    );

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });
    authToken = loginResponse.body.token;

    // Seed test candidate
    await pool.query(
      `INSERT INTO candidates (id, name, email, location, status, summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['c1', 'John Doe', 'john@example.com', 'Tel Aviv', 'active', 'A skilled developer']
    );

    // Seed test file
    const fileResult = await pool.query(
      `INSERT INTO files (candidate_id, file_name, file_type, mime_type, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['c1', 'cv_001.pdf', 'cv', 'application/pdf', Buffer.from('PDF content here')]
    );
    testFileId = fileResult.rows[0].id;
  });

  describe('GET /api/candidates/:id/files', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/candidates/c1/files');
      expect(response.status).toBe(401);
    });

    it('should return list of files for candidate', async () => {
      const response = await request(app)
        .get('/api/candidates/c1/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('fileName');
      expect(response.body[0]).toHaveProperty('fileType');
      expect(response.body[0]).toHaveProperty('mimeType');
      expect(response.body[0]).not.toHaveProperty('content');
    });

    it('should return 404 for non-existent candidate', async () => {
      const response = await request(app)
        .get('/api/candidates/nonexistent/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/files/:fileId', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get(`/api/files/${testFileId}`);
      expect(response.status).toBe(401);
    });

    it('should download file content', async () => {
      const response = await request(app)
        .get(`/api/files/${testFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('cv_001.pdf');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/files/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
