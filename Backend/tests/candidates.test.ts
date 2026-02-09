import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Candidates API', () => {
  let authToken: string;

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
      `INSERT INTO candidates (id, name, email, location, status, summary, skills, languages, experience, education, certifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        'c1',
        'John Doe',
        'john@example.com',
        'Tel Aviv',
        'active',
        'A skilled developer',
        JSON.stringify([{ name: 'JavaScript', level: 'advanced' }]),
        JSON.stringify(['English', 'Hebrew']),
        JSON.stringify([{ title: 'Developer', company: 'Tech Corp', startDate: '2020-01', endDate: null, highlights: ['Built apps'] }]),
        JSON.stringify([{ degree: 'B.Sc.', institution: 'University', startDate: '2016-01', endDate: '2020-01', status: 'completed' }]),
        JSON.stringify([{ name: 'AWS Certified', year: '2022' }]),
      ]
    );
  });

  describe('GET /api/candidates', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/candidates');
      expect(response.status).toBe(401);
    });

    it('should return array of candidates with auth token', async () => {
      const response = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('should return candidates with correct structure', async () => {
      const response = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${authToken}`);

      const candidate = response.body[0];
      expect(candidate).toHaveProperty('id');
      expect(candidate).toHaveProperty('name');
      expect(candidate).toHaveProperty('email');
      expect(candidate).toHaveProperty('location');
      expect(candidate).toHaveProperty('status');
      expect(candidate).toHaveProperty('summary');
      expect(candidate).toHaveProperty('skills');
      expect(candidate).toHaveProperty('languages');
      expect(candidate).toHaveProperty('experience');
      expect(candidate).toHaveProperty('education');
      expect(candidate).toHaveProperty('certifications');
      expect(candidate).toHaveProperty('positionIds');
      expect(Array.isArray(candidate.positionIds)).toBe(true);
    });
  });

  describe('GET /api/candidates/:id', () => {
    it('should return single candidate by id', async () => {
      const response = await request(app)
        .get('/api/candidates/c1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('c1');
      expect(response.body.name).toBe('John Doe');
    });

    it('should return 404 for non-existent candidate', async () => {
      const response = await request(app)
        .get('/api/candidates/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/candidates/:id/positions/:positionId', () => {
    beforeEach(async () => {
      // Seed test position
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['p1', 'Test Position', 'Test Co', 'Tel Aviv', 'open', 'Test', 'HR', 'hr@test.com']
      );
    });

    it('should assign candidate to position', async () => {
      const response = await request(app)
        .post('/api/candidates/c1/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.positionIds).toContain('p1');
    });

    it('should return 404 for non-existent candidate', async () => {
      const response = await request(app)
        .post('/api/candidates/nonexistent/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should not duplicate assignment', async () => {
      // First assignment
      await request(app)
        .post('/api/candidates/c1/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      // Second assignment (should not duplicate)
      const response = await request(app)
        .post('/api/candidates/c1/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.positionIds.filter((id: string) => id === 'p1').length).toBe(1);
    });
  });

  describe('DELETE /api/candidates/:id/positions/:positionId', () => {
    beforeEach(async () => {
      // Seed test position
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['p1', 'Test Position', 'Test Co', 'Tel Aviv', 'open', 'Test', 'HR', 'hr@test.com']
      );
      // Assign candidate to position
      await pool.query(
        `INSERT INTO candidate_positions (candidate_id, position_id) VALUES ($1, $2)`,
        ['c1', 'p1']
      );
    });

    it('should unassign candidate from position', async () => {
      const response = await request(app)
        .delete('/api/candidates/c1/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.positionIds).not.toContain('p1');
    });

    it('should return 404 for non-existent candidate', async () => {
      const response = await request(app)
        .delete('/api/candidates/nonexistent/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
