import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = process.env.TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_PASSWORD environment variable is required');
}

// Helper function to seed a test position with normalized data
async function seedTestPosition(positionId: string = 'p1') {
  // Insert position
  await pool.query(
    `INSERT INTO positions (id, title, company, location, status, description, experience_years, work_type, salary, contact_name, contact_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      positionId,
      'Senior DevOps Engineer',
      'Tech Corp',
      'Tel Aviv',
      'open',
      'We are looking for a senior DevOps engineer',
      5,
      'hybrid',
      'Competitive',
      'John HR',
      'hr@techcorp.com',
    ]
  );

  // Insert skills and link to position
  const skillNames = ['AWS', 'Kubernetes', 'Docker'];
  for (const skillName of skillNames) {
    const skillResult = await pool.query(
      `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [skillName]
    );
    await pool.query(`INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2)`, [
      positionId,
      skillResult.rows[0].id,
    ]);
  }

  // Insert requirement
  await pool.query(
    `INSERT INTO position_requirements (position_id, text, required, sort_order) VALUES ($1, $2, $3, $4)`,
    [positionId, '5+ years experience', true, 0]
  );
}

describe('Positions API', () => {
  let authToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Seed admin user
    await pool.query(`INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`, [
      'admin@hellio.com',
      passwordHash,
      'Admin',
      'admin',
    ]);

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hellio.com', password: TEST_PASSWORD });
    authToken = loginResponse.body.token;

    // Seed test position
    await seedTestPosition('p1');
  });

  describe('GET /api/positions', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/positions');
      expect(response.status).toBe(401);
    });

    it('should return array of positions', async () => {
      const response = await request(app).get('/api/positions').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('should return positions with correct structure', async () => {
      const response = await request(app).get('/api/positions').set('Authorization', `Bearer ${authToken}`);

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

    it('should return skills as string array', async () => {
      const response = await request(app).get('/api/positions').set('Authorization', `Bearer ${authToken}`);

      const position = response.body[0];
      expect(Array.isArray(position.skills)).toBe(true);
      expect(position.skills).toContain('AWS');
      expect(position.skills).toContain('Kubernetes');
      expect(position.skills).toContain('Docker');
    });

    it('should return requirements with text and required', async () => {
      const response = await request(app).get('/api/positions').set('Authorization', `Bearer ${authToken}`);

      const position = response.body[0];
      expect(Array.isArray(position.requirements)).toBe(true);
      expect(position.requirements.length).toBeGreaterThan(0);
      expect(position.requirements[0]).toHaveProperty('text');
      expect(position.requirements[0]).toHaveProperty('required');
      expect(position.requirements[0].text).toBe('5+ years experience');
      expect(position.requirements[0].required).toBe(true);
    });
  });

  describe('GET /api/positions/:id', () => {
    it('should return single position by id', async () => {
      const response = await request(app).get('/api/positions/p1').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('p1');
      expect(response.body.title).toBe('Senior DevOps Engineer');
    });

    it('should return 404 for non-existent position', async () => {
      const response = await request(app).get('/api/positions/nonexistent').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/positions/:id', () => {
    it('should update position basic fields', async () => {
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

    it('should update position skills', async () => {
      const response = await request(app)
        .put('/api/positions/p1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Senior DevOps Engineer',
          company: 'Tech Corp',
          location: 'Tel Aviv',
          status: 'open',
          description: 'We are looking for a senior DevOps engineer',
          requirements: [{ text: '5+ years experience', required: true }],
          skills: ['Python', 'Go', 'Terraform'],
          experienceYears: 5,
          workType: 'hybrid',
          salary: 'Competitive',
          contactName: 'John HR',
          contactEmail: 'hr@techcorp.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.skills).toContain('Python');
      expect(response.body.skills).toContain('Go');
      expect(response.body.skills).toContain('Terraform');
      expect(response.body.skills).not.toContain('AWS');
    });

    it('should update position requirements', async () => {
      const response = await request(app)
        .put('/api/positions/p1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Senior DevOps Engineer',
          company: 'Tech Corp',
          location: 'Tel Aviv',
          status: 'open',
          description: 'We are looking for a senior DevOps engineer',
          requirements: [
            { text: 'New requirement 1', required: true },
            { text: 'New requirement 2', required: false },
          ],
          skills: ['AWS', 'Kubernetes', 'Docker'],
          experienceYears: 5,
          workType: 'hybrid',
          salary: 'Competitive',
          contactName: 'John HR',
          contactEmail: 'hr@techcorp.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.requirements.length).toBe(2);
      expect(response.body.requirements[0].text).toBe('New requirement 1');
      expect(response.body.requirements[1].text).toBe('New requirement 2');
      expect(response.body.requirements[1].required).toBe(false);
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
      await pool.query(`INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`, [
        'viewer@hellio.com',
        passwordHash,
        'Viewer',
        'viewer',
      ]);

      // Get viewer auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@hellio.com', password: TEST_PASSWORD });
      viewerToken = loginResponse.body.token;
    });

    it('should allow viewer to read positions', async () => {
      const response = await request(app).get('/api/positions').set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow viewer to read single position', async () => {
      const response = await request(app).get('/api/positions/p1').set('Authorization', `Bearer ${viewerToken}`);

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
