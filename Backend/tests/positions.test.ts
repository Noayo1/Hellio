import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Positions API', () => {
  let authToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Seed admin user
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
      ['admin@hellio.com', passwordHash, 'Admin', 'admin']
    );

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });
    authToken = loginResponse.body.token;

    // Seed test position
    await pool.query(
      `INSERT INTO positions (id, title, company, location, status, description, requirements, skills, experience_years, work_type, salary, contact_name, contact_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        'p1',
        'Senior DevOps Engineer',
        'Tech Corp',
        'Tel Aviv',
        'open',
        'We are looking for a senior DevOps engineer',
        JSON.stringify([{ text: '5+ years experience', required: true }]),
        JSON.stringify(['AWS', 'Kubernetes', 'Docker']),
        5,
        'hybrid',
        'Competitive',
        'John HR',
        'hr@techcorp.com',
      ]
    );
  });

  describe('GET /api/positions', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/positions');
      expect(response.status).toBe(401);
    });

    it('should return array of positions', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('should return positions with correct structure', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`);

      const position = response.body[0];
      expect(position).toHaveProperty('id');
      expect(position).toHaveProperty('title');
      expect(position).toHaveProperty('company');
      expect(position).toHaveProperty('location');
      expect(position).toHaveProperty('status');
      expect(position).toHaveProperty('description');
      expect(position).toHaveProperty('requirements');
      expect(position).toHaveProperty('skills');
      expect(position).toHaveProperty('experienceYears');
      expect(position).toHaveProperty('workType');
      expect(position).toHaveProperty('contactName');
      expect(position).toHaveProperty('contactEmail');
    });
  });

  describe('GET /api/positions/:id', () => {
    it('should return single position by id', async () => {
      const response = await request(app)
        .get('/api/positions/p1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('p1');
      expect(response.body.title).toBe('Senior DevOps Engineer');
    });

    it('should return 404 for non-existent position', async () => {
      const response = await request(app)
        .get('/api/positions/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/positions/:id', () => {
    it('should update position', async () => {
      const response = await request(app)
        .put('/api/positions/p1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          company: 'Tech Corp',
          location: 'Tel Aviv',
          status: 'closed',
          description: 'Updated description',
          requirements: [{ text: 'Updated requirement', required: true }],
          skills: ['AWS', 'GCP'],
          experienceYears: 3,
          workType: 'remote',
          salary: 'High',
          contactName: 'Jane HR',
          contactEmail: 'jane@techcorp.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.status).toBe('closed');
    });

    it('should return 404 when updating non-existent position', async () => {
      const response = await request(app)
        .put('/api/positions/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          company: 'Test',
          location: 'Test',
          status: 'open',
          description: 'Test',
          requirements: [],
          skills: [],
          experienceYears: 0,
          workType: 'remote',
          contactName: 'Test',
          contactEmail: 'test@test.com',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Viewer role restrictions', () => {
    let viewerToken: string;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

      // Seed viewer user
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
        ['viewer@hellio.com', passwordHash, 'Viewer', 'viewer']
      );

      // Get viewer auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@hellio.com', password: TEST_PASSWORD });
      viewerToken = loginResponse.body.token;
    });

    it('should allow viewer to read positions', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow viewer to read single position', async () => {
      const response = await request(app)
        .get('/api/positions/p1')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('p1');
    });

    it('should reject position update for viewer role', async () => {
      const response = await request(app)
        .put('/api/positions/p1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Attempted Update',
          company: 'Tech Corp',
          location: 'Tel Aviv',
          status: 'open',
          description: 'Test',
          requirements: [],
          skills: [],
          experienceYears: 0,
          workType: 'remote',
          contactName: 'Test',
          contactEmail: 'test@test.com',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });
});
