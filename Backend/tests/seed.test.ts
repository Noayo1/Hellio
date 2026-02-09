import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import pool from '../src/db.js';

describe('Database Seeding', () => {
  // Note: These tests verify the structure after seeding
  // They don't run the actual seed script but verify expected data patterns

  describe('Skills table', () => {
    beforeEach(async () => {
      // Clean and seed sample data
      await pool.query('DELETE FROM candidate_skills');
      await pool.query('DELETE FROM position_skills');
      await pool.query('DELETE FROM skills');

      // Insert some skills
      await pool.query(`INSERT INTO skills (name) VALUES ('JavaScript'), ('Python'), ('AWS'), ('Docker')`);
    });

    it('should store unique skill names', async () => {
      const result = await pool.query(`SELECT * FROM skills ORDER BY name`);
      expect(result.rows.length).toBe(4);
      expect(result.rows.map((r) => r.name)).toContain('JavaScript');
    });

    it('should reject duplicate skill names', async () => {
      await expect(pool.query(`INSERT INTO skills (name) VALUES ('JavaScript')`)).rejects.toThrow();
    });

    it('should auto-increment skill IDs', async () => {
      const result = await pool.query(`SELECT id FROM skills ORDER BY id`);
      expect(result.rows.length).toBe(4);
      expect(result.rows[0].id).toBeDefined();
      expect(typeof result.rows[0].id).toBe('number');
    });
  });

  describe('Languages table', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM candidate_languages');
      await pool.query('DELETE FROM languages');

      await pool.query(`INSERT INTO languages (name) VALUES ('English'), ('Hebrew'), ('Spanish')`);
    });

    it('should store unique language names', async () => {
      const result = await pool.query(`SELECT * FROM languages ORDER BY name`);
      expect(result.rows.length).toBe(3);
    });

    it('should reject duplicate language names', async () => {
      await expect(pool.query(`INSERT INTO languages (name) VALUES ('English')`)).rejects.toThrow();
    });
  });

  describe('Candidate skills junction', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM candidate_skills');
      await pool.query('DELETE FROM candidates');
      await pool.query('DELETE FROM skills');

      // Create candidate
      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ('c1', 'John', 'john@test.com', 'TLV', 'active', 'Summary')`
      );
      // Create skills
      await pool.query(`INSERT INTO skills (id, name) VALUES (1, 'JavaScript'), (2, 'Python')`);
    });

    it('should link candidate to skills with level', async () => {
      await pool.query(`INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ('c1', 1, 'advanced')`);
      await pool.query(`INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ('c1', 2, 'intermediate')`);

      const result = await pool.query(
        `SELECT cs.*, s.name FROM candidate_skills cs JOIN skills s ON cs.skill_id = s.id WHERE candidate_id = 'c1'`
      );
      expect(result.rows.length).toBe(2);
      expect(result.rows.find((r) => r.name === 'JavaScript')?.level).toBe('advanced');
    });

    it('should reject duplicate candidate-skill pairs', async () => {
      await pool.query(`INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ('c1', 1)`);
      await expect(pool.query(`INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ('c1', 1)`)).rejects.toThrow();
    });
  });

  describe('Position skills junction', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM position_skills');
      await pool.query('DELETE FROM positions');
      await pool.query('DELETE FROM skills');

      // Create position
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ('p1', 'Dev', 'Co', 'TLV', 'open', 'Desc', 'HR', 'hr@co.com')`
      );
      // Create skills
      await pool.query(`INSERT INTO skills (id, name) VALUES (1, 'AWS'), (2, 'Docker')`);
    });

    it('should link position to skills', async () => {
      await pool.query(`INSERT INTO position_skills (position_id, skill_id) VALUES ('p1', 1)`);
      await pool.query(`INSERT INTO position_skills (position_id, skill_id) VALUES ('p1', 2)`);

      const result = await pool.query(
        `SELECT ps.*, s.name FROM position_skills ps JOIN skills s ON ps.skill_id = s.id WHERE position_id = 'p1'`
      );
      expect(result.rows.length).toBe(2);
    });
  });

  describe('Experiences with highlights', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM experience_highlights');
      await pool.query('DELETE FROM experiences');
      await pool.query('DELETE FROM candidates');

      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ('c1', 'John', 'john@test.com', 'TLV', 'active', 'Summary')`
      );
    });

    it('should store experience records', async () => {
      const expResult = await pool.query(
        `INSERT INTO experiences (candidate_id, title, company, start_date, end_date, sort_order)
         VALUES ('c1', 'Developer', 'Tech Corp', '2020-01-01', NULL, 0) RETURNING id`
      );

      const result = await pool.query(`SELECT * FROM experiences WHERE candidate_id = 'c1'`);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].title).toBe('Developer');
      expect(result.rows[0].end_date).toBeNull();
    });

    it('should store highlights for experience', async () => {
      const expResult = await pool.query(
        `INSERT INTO experiences (candidate_id, title, company, start_date, sort_order)
         VALUES ('c1', 'Developer', 'Tech Corp', '2020-01-01', 0) RETURNING id`
      );
      const expId = expResult.rows[0].id;

      await pool.query(`INSERT INTO experience_highlights (experience_id, highlight, sort_order) VALUES ($1, 'Built apps', 0)`, [
        expId,
      ]);
      await pool.query(
        `INSERT INTO experience_highlights (experience_id, highlight, sort_order) VALUES ($1, 'Led team', 1)`,
        [expId]
      );

      const result = await pool.query(`SELECT * FROM experience_highlights WHERE experience_id = $1 ORDER BY sort_order`, [
        expId,
      ]);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].highlight).toBe('Built apps');
    });

    it('should cascade delete highlights when experience deleted', async () => {
      const expResult = await pool.query(
        `INSERT INTO experiences (candidate_id, title, company, start_date, sort_order)
         VALUES ('c1', 'Developer', 'Tech Corp', '2020-01-01', 0) RETURNING id`
      );
      const expId = expResult.rows[0].id;

      await pool.query(`INSERT INTO experience_highlights (experience_id, highlight, sort_order) VALUES ($1, 'Built apps', 0)`, [
        expId,
      ]);

      await pool.query(`DELETE FROM experiences WHERE id = $1`, [expId]);

      const result = await pool.query(`SELECT * FROM experience_highlights WHERE experience_id = $1`, [expId]);
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Education records', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM education');
      await pool.query('DELETE FROM candidates');

      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ('c1', 'John', 'john@test.com', 'TLV', 'active', 'Summary')`
      );
    });

    it('should store education records', async () => {
      await pool.query(
        `INSERT INTO education (candidate_id, degree, institution, start_date, end_date, status, sort_order)
         VALUES ('c1', 'B.Sc.', 'University', '2016-01-01', '2020-01-01', 'completed', 0)`
      );

      const result = await pool.query(`SELECT * FROM education WHERE candidate_id = 'c1'`);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].degree).toBe('B.Sc.');
      expect(result.rows[0].status).toBe('completed');
    });
  });

  describe('Certifications', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM certifications');
      await pool.query('DELETE FROM candidates');

      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ('c1', 'John', 'john@test.com', 'TLV', 'active', 'Summary')`
      );
    });

    it('should store certification records', async () => {
      await pool.query(`INSERT INTO certifications (candidate_id, name, year, sort_order) VALUES ('c1', 'AWS Certified', 2022, 0)`);

      const result = await pool.query(`SELECT * FROM certifications WHERE candidate_id = 'c1'`);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('AWS Certified');
      expect(result.rows[0].year).toBe(2022);
    });
  });

  describe('Position requirements', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM position_requirements');
      await pool.query('DELETE FROM positions');

      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ('p1', 'Dev', 'Co', 'TLV', 'open', 'Desc', 'HR', 'hr@co.com')`
      );
    });

    it('should store requirement records', async () => {
      await pool.query(
        `INSERT INTO position_requirements (position_id, text, required, sort_order) VALUES ('p1', '5+ years experience', true, 0)`
      );
      await pool.query(
        `INSERT INTO position_requirements (position_id, text, required, sort_order) VALUES ('p1', 'Nice to have: PhD', false, 1)`
      );

      const result = await pool.query(`SELECT * FROM position_requirements WHERE position_id = 'p1' ORDER BY sort_order`);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].text).toBe('5+ years experience');
      expect(result.rows[0].required).toBe(true);
      expect(result.rows[1].required).toBe(false);
    });
  });

  describe('Seed idempotency', () => {
    it('should allow upsert of skills with ON CONFLICT', async () => {
      await pool.query('DELETE FROM candidate_skills');
      await pool.query('DELETE FROM position_skills');
      await pool.query('DELETE FROM skills');

      // First insert
      await pool.query(
        `INSERT INTO skills (name) VALUES ('JavaScript') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`
      );

      // Second insert (should not fail)
      await pool.query(
        `INSERT INTO skills (name) VALUES ('JavaScript') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`
      );

      const result = await pool.query(`SELECT * FROM skills WHERE name = 'JavaScript'`);
      expect(result.rows.length).toBe(1);
    });
  });
});
