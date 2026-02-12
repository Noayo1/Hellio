import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

// Mock the Bedrock client to avoid actual LLM calls
vi.mock('../src/ingestion/extractors/bedrock.js', () => ({
  invokeNova: vi.fn(),
}));

import { invokeNova } from '../src/ingestion/extractors/bedrock.js';
const mockInvokeNova = vi.mocked(invokeNova);

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

describe('Chat API', () => {
  let authToken: string;

  beforeEach(async () => {
    // Seed admin user
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@hellio.com', passwordHash, 'Admin', 'admin']
    );

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });
    authToken = loginResponse.body.token;

    // Seed test data
    await pool.query(`
      INSERT INTO skills (id, name) VALUES
        (1, 'JavaScript'),
        (2, 'Python'),
        (3, 'Kubernetes'),
        (4, 'TypeScript')
      ON CONFLICT (id) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO candidates (id, name, email, status, location, summary) VALUES
        ('c1', 'Alice Smith', 'alice@test.com', 'active', 'New York', 'Senior developer with Kubernetes experience'),
        ('c2', 'Bob Jones', 'bob@test.com', 'active', 'London', 'Backend developer'),
        ('c3', 'Charlie Brown', 'charlie@test.com', 'active', 'Paris', 'DevOps engineer')
      ON CONFLICT (id) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES
        ('c1', 3, 'expert'),
        ('c1', 1, 'advanced'),
        ('c2', 2, 'intermediate'),
        ('c3', 3, 'advanced')
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO positions (id, title, company, status, location, department, description, experience_years, work_type, contact_name, contact_email) VALUES
        ('p1', 'Senior Engineer', 'TechCorp', 'open', 'New York', 'Engineering', 'Senior role', 5, 'hybrid', 'HR Team', 'hr@techcorp.com'),
        ('p2', 'DevOps Lead', 'CloudInc', 'open', 'Remote', 'Operations', 'DevOps position', 3, 'remote', 'Recruiter', 'jobs@cloudinc.com'),
        ('p3', 'Junior Developer', 'StartupXYZ', 'open', 'London', 'Engineering', 'Entry level', 0, 'onsite', 'Hiring', 'hire@startupxyz.com'),
        ('p4', 'Product Manager', 'BigCo', 'closed', 'Boston', 'Product', 'PM role', 4, 'hybrid', 'PM Lead', 'pm@bigco.com')
      ON CONFLICT (id) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO candidate_positions (candidate_id, position_id) VALUES
        ('c1', 'p1'),
        ('c2', 'p1'),
        ('c3', 'p2')
      ON CONFLICT DO NOTHING
    `);

    // Reset mock
    mockInvokeNova.mockReset();
  });

  describe('POST /api/chat', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ question: 'How many candidates?' });

      expect(response.status).toBe(401);
    });

    it('should reject empty question', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return answer with trace for valid question', async () => {
      // Mock SQL generation
      mockInvokeNova.mockResolvedValueOnce({
        text: 'SELECT COUNT(*) as count FROM candidates WHERE status = \'active\'',
        durationMs: 100,
      });

      // Mock answer generation
      mockInvokeNova.mockResolvedValueOnce({
        text: 'There are 3 active candidates in the system.',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'How many active candidates are there?' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('trace');
      expect(response.body.trace).toHaveProperty('sql');
      expect(response.body.trace).toHaveProperty('rowCount');
      expect(response.body.trace).toHaveProperty('rows');
    });

    it('should handle irrelevant questions gracefully', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: 'IRRELEVANT',
        durationMs: 50,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'What is the weather today?' });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
      expect(response.body.suggestion).toBeDefined();
    });

    it('should handle SQL validation errors', async () => {
      // Mock LLM returning invalid SQL
      mockInvokeNova.mockResolvedValueOnce({
        text: 'DELETE FROM candidates',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'Delete all candidates' });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
    });

    it('should handle SQL execution errors', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: 'SELECT * FROM nonexistent_table',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'Show me the nonexistent data' });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
    });

    it('should handle LLM errors gracefully', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: '',
        durationMs: 100,
        error: 'LLM timeout',
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'How many candidates?' });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Required questions', () => {
    it('should handle: list open position counts by department', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: `SELECT department, COUNT(*) as position_count
               FROM positions
               WHERE status = 'open'
               GROUP BY department
               ORDER BY position_count DESC
               LIMIT 50`,
        durationMs: 100,
      });

      mockInvokeNova.mockResolvedValueOnce({
        text: 'There are 2 open positions in Engineering and 1 in Operations.',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'list open position counts by department' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toBeDefined();
      expect(response.body.trace.sql).toContain('GROUP BY');
    });

    it('should handle: which positions do not have any candidate', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: `SELECT p.id, p.title, p.company, p.status
               FROM positions p
               LEFT JOIN candidate_positions cp ON p.id = cp.position_id
               WHERE cp.candidate_id IS NULL
               LIMIT 50`,
        durationMs: 100,
      });

      mockInvokeNova.mockResolvedValueOnce({
        text: 'There are 2 positions without any candidates: Junior Developer at StartupXYZ and Product Manager at BigCo.',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'which positions do not have any candidate' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toBeDefined();
      expect(response.body.trace.sql).toContain('LEFT JOIN');
      expect(response.body.trace.sql).toContain('IS NULL');
    });

    it('should handle: which positions have more than X candidates', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: `SELECT p.id, p.title, p.company, COUNT(cp.candidate_id) as candidate_count
               FROM positions p
               JOIN candidate_positions cp ON p.id = cp.position_id
               GROUP BY p.id, p.title, p.company
               HAVING COUNT(cp.candidate_id) > 1
               ORDER BY candidate_count DESC
               LIMIT 50`,
        durationMs: 100,
      });

      mockInvokeNova.mockResolvedValueOnce({
        text: 'The Senior Engineer position at TechCorp has 2 candidates.',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'which positions have more than 1 candidate' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toBeDefined();
      expect(response.body.trace.sql).toContain('HAVING');
    });

    it('should handle: list all candidates with kubernetes experience', async () => {
      mockInvokeNova.mockResolvedValueOnce({
        text: `SELECT DISTINCT c.id, c.name, c.email, c.location, s.name as skill_name, cs.level
               FROM candidates c
               JOIN candidate_skills cs ON c.id = cs.candidate_id
               JOIN skills s ON cs.skill_id = s.id
               WHERE LOWER(s.name) ILIKE '%kubernetes%'
               LIMIT 50`,
        durationMs: 100,
      });

      mockInvokeNova.mockResolvedValueOnce({
        text: 'There are 2 candidates with Kubernetes experience: Alice Smith (expert level) and Charlie Brown (advanced level).',
        durationMs: 100,
      });

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: 'list all candidates with kubernetes experience' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toBeDefined();
      expect(response.body.trace.sql.toLowerCase()).toContain('kubernetes');
      expect(response.body.trace.rowCount).toBeGreaterThan(0);
    });
  });
});
