import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Agent API', () => {
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
  });

  describe('Processed Emails API', () => {
    describe('POST /api/agent/processed-emails', () => {
      it('should create processed email record', async () => {
        const response = await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            emailId: 'msg_123',
            emailType: 'candidate',
            actionTaken: 'ingested',
            candidateId: 'cand_456',
            summary: 'Processed CV from John Doe'
          });

        expect(response.status).toBe(201);
        expect(response.body.emailId).toBe('msg_123');
        expect(response.body.emailType).toBe('candidate');
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post('/api/agent/processed-emails')
          .send({ emailId: 'msg_123', emailType: 'candidate' });

        expect(response.status).toBe(401);
      });

      it('should be idempotent - return existing on duplicate', async () => {
        // First insert
        await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ emailId: 'msg_123', emailType: 'candidate', summary: 'First' });

        // Second insert with same emailId
        const response = await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ emailId: 'msg_123', emailType: 'position', summary: 'Second' });

        expect(response.status).toBe(200);
        expect(response.body.emailType).toBe('candidate'); // Original value preserved
      });

      it('should require emailId and emailType', async () => {
        const response = await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/agent/processed-emails/:emailId', () => {
      it('should return processed email by id', async () => {
        // First create
        await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ emailId: 'msg_123', emailType: 'candidate', summary: 'Test' });

        // Then get
        const response = await request(app)
          .get('/api/agent/processed-emails/msg_123')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.emailId).toBe('msg_123');
      });

      it('should return 404 for non-existent email', async () => {
        const response = await request(app)
          .get('/api/agent/processed-emails/nonexistent')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/agent/processed-emails', () => {
      it('should return list of processed emails', async () => {
        // Create some records
        await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ emailId: 'msg_1', emailType: 'candidate' });

        await request(app)
          .post('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ emailId: 'msg_2', emailType: 'position' });

        const response = await request(app)
          .get('/api/agent/processed-emails')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
      });
    });
  });

  describe('Notifications API', () => {
    describe('POST /api/agent/notifications', () => {
      it('should create notification', async () => {
        const response = await request(app)
          .post('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'new_candidate',
            summary: 'New candidate John Doe for DevOps position',
            actionUrl: '/candidates/cand_123',
            candidateId: 'cand_123'
          });

        expect(response.status).toBe(201);
        expect(response.body.type).toBe('new_candidate');
        expect(response.body.status).toBe('pending');
        expect(response.body).toHaveProperty('id');
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post('/api/agent/notifications')
          .send({ type: 'new_candidate', summary: 'Test' });

        expect(response.status).toBe(401);
      });

      it('should require type and summary', async () => {
        const response = await request(app)
          .post('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/agent/notifications', () => {
      it('should return pending notifications by default', async () => {
        // Create pending notification
        await request(app)
          .post('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'new_candidate', summary: 'Pending notification' });

        const response = await request(app)
          .get('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].status).toBe('pending');
      });

      it('should filter by status', async () => {
        // Create notification and mark as reviewed
        const createRes = await request(app)
          .post('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'new_candidate', summary: 'Test' });

        await request(app)
          .put(`/api/agent/notifications/${createRes.body.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'reviewed' });

        // Should not appear in pending
        const pendingRes = await request(app)
          .get('/api/agent/notifications?status=pending')
          .set('Authorization', `Bearer ${authToken}`);

        expect(pendingRes.body.length).toBe(0);

        // Should appear in reviewed
        const reviewedRes = await request(app)
          .get('/api/agent/notifications?status=reviewed')
          .set('Authorization', `Bearer ${authToken}`);

        expect(reviewedRes.body.length).toBe(1);
      });
    });

    describe('PUT /api/agent/notifications/:id', () => {
      it('should update notification status', async () => {
        // Create notification
        const createRes = await request(app)
          .post('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'new_candidate', summary: 'Test' });

        // Update status
        const response = await request(app)
          .put(`/api/agent/notifications/${createRes.body.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'reviewed' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('reviewed');
      });

      it('should return 404 for non-existent notification', async () => {
        const response = await request(app)
          .put('/api/agent/notifications/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'reviewed' });

        expect(response.status).toBe(404);
      });

      it('should only allow valid status values', async () => {
        const createRes = await request(app)
          .post('/api/agent/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'new_candidate', summary: 'Test' });

        const response = await request(app)
          .put(`/api/agent/notifications/${createRes.body.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'invalid_status' });

        expect(response.status).toBe(400);
      });
    });
  });
});
