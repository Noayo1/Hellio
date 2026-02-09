import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Authentication', () => {
  beforeEach(async () => {
    // Seed admin user for tests
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@hellio.com', passwordHash, 'Admin']
    );
  });

  describe('POST /api/auth/login', () => {
    it('should return JWT token with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('admin@hellio.com');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hellio.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@hellio.com', password: TEST_PASSWORD });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('admin@hellio.com');
      expect(response.body.name).toBe('Admin');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
