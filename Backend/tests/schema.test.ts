import { describe, it, expect, beforeEach } from 'vitest';
import pool from '../src/db.js';

describe('Database Schema', () => {
  // Helper to check if table exists
  async function tableExists(tableName: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  }

  // Helper to get table columns
  async function getTableColumns(tableName: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    return result.rows.map((row) => row.column_name);
  }

  describe('Table existence', () => {
    it('should have users table', async () => {
      expect(await tableExists('users')).toBe(true);
    });

    it('should have candidates table', async () => {
      expect(await tableExists('candidates')).toBe(true);
    });

    it('should have positions table', async () => {
      expect(await tableExists('positions')).toBe(true);
    });

    it('should have files table', async () => {
      expect(await tableExists('files')).toBe(true);
    });

    it('should have candidate_positions table', async () => {
      expect(await tableExists('candidate_positions')).toBe(true);
    });

    it('should have skills table', async () => {
      expect(await tableExists('skills')).toBe(true);
    });

    it('should have candidate_skills table', async () => {
      expect(await tableExists('candidate_skills')).toBe(true);
    });

    it('should have position_skills table', async () => {
      expect(await tableExists('position_skills')).toBe(true);
    });

    it('should have languages table', async () => {
      expect(await tableExists('languages')).toBe(true);
    });

    it('should have candidate_languages table', async () => {
      expect(await tableExists('candidate_languages')).toBe(true);
    });

    it('should have experiences table', async () => {
      expect(await tableExists('experiences')).toBe(true);
    });

    it('should have experience_highlights table', async () => {
      expect(await tableExists('experience_highlights')).toBe(true);
    });

    it('should have education table', async () => {
      expect(await tableExists('education')).toBe(true);
    });

    it('should have certifications table', async () => {
      expect(await tableExists('certifications')).toBe(true);
    });

    it('should have position_requirements table', async () => {
      expect(await tableExists('position_requirements')).toBe(true);
    });
  });

  describe('Candidates table structure', () => {
    it('should NOT have JSONB columns (skills, languages, experience, education, certifications)', async () => {
      const columns = await getTableColumns('candidates');
      expect(columns).not.toContain('skills');
      expect(columns).not.toContain('languages');
      expect(columns).not.toContain('experience');
      expect(columns).not.toContain('education');
      expect(columns).not.toContain('certifications');
    });

    it('should have core columns', async () => {
      const columns = await getTableColumns('candidates');
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('email');
      expect(columns).toContain('location');
      expect(columns).toContain('status');
      expect(columns).toContain('summary');
    });
  });

  describe('Positions table structure', () => {
    it('should NOT have JSONB columns (requirements, skills)', async () => {
      const columns = await getTableColumns('positions');
      expect(columns).not.toContain('requirements');
      expect(columns).not.toContain('skills');
    });

    it('should have core columns', async () => {
      const columns = await getTableColumns('positions');
      expect(columns).toContain('id');
      expect(columns).toContain('title');
      expect(columns).toContain('company');
      expect(columns).toContain('description');
      expect(columns).toContain('experience_years');
    });
  });

  describe('Foreign key cascades', () => {
    beforeEach(async () => {
      // Clean up in correct order (respecting FK constraints)
      await pool.query('DELETE FROM experience_highlights');
      await pool.query('DELETE FROM experiences');
      await pool.query('DELETE FROM candidate_skills');
      await pool.query('DELETE FROM candidate_languages');
      await pool.query('DELETE FROM education');
      await pool.query('DELETE FROM certifications');
      await pool.query('DELETE FROM position_skills');
      await pool.query('DELETE FROM position_requirements');
      await pool.query('DELETE FROM candidate_positions');
      await pool.query('DELETE FROM files');
      await pool.query('DELETE FROM candidates');
      await pool.query('DELETE FROM positions');
      await pool.query('DELETE FROM skills');
      await pool.query('DELETE FROM languages');
    });

    it('should cascade delete candidate_skills when candidate is deleted', async () => {
      // Insert candidate
      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['c1', 'Test', 'test@test.com', 'Tel Aviv', 'active', 'Summary']
      );
      // Insert skill
      await pool.query(`INSERT INTO skills (id, name) VALUES (1, 'JavaScript')`);
      // Link candidate to skill
      await pool.query(
        `INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ($1, $2, $3)`,
        ['c1', 1, 'advanced']
      );

      // Delete candidate
      await pool.query(`DELETE FROM candidates WHERE id = 'c1'`);

      // Check candidate_skills is empty
      const result = await pool.query(`SELECT * FROM candidate_skills WHERE candidate_id = 'c1'`);
      expect(result.rows.length).toBe(0);
    });

    it('should cascade delete experiences when candidate is deleted', async () => {
      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['c1', 'Test', 'test@test.com', 'Tel Aviv', 'active', 'Summary']
      );
      await pool.query(
        `INSERT INTO experiences (id, candidate_id, title, company, start_date) VALUES ($1, $2, $3, $4, $5)`,
        [1, 'c1', 'Developer', 'Company', '2020-01-01']
      );

      await pool.query(`DELETE FROM candidates WHERE id = 'c1'`);

      const result = await pool.query(`SELECT * FROM experiences WHERE candidate_id = 'c1'`);
      expect(result.rows.length).toBe(0);
    });

    it('should cascade delete experience_highlights when experience is deleted', async () => {
      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['c1', 'Test', 'test@test.com', 'Tel Aviv', 'active', 'Summary']
      );
      await pool.query(
        `INSERT INTO experiences (id, candidate_id, title, company, start_date) VALUES ($1, $2, $3, $4, $5)`,
        [1, 'c1', 'Developer', 'Company', '2020-01-01']
      );
      await pool.query(
        `INSERT INTO experience_highlights (id, experience_id, highlight) VALUES ($1, $2, $3)`,
        [1, 1, 'Built amazing apps']
      );

      await pool.query(`DELETE FROM experiences WHERE id = 1`);

      const result = await pool.query(`SELECT * FROM experience_highlights WHERE experience_id = 1`);
      expect(result.rows.length).toBe(0);
    });

    it('should cascade delete position_skills when position is deleted', async () => {
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['p1', 'Developer', 'Company', 'Tel Aviv', 'open', 'Desc', 'HR', 'hr@test.com']
      );
      await pool.query(`INSERT INTO skills (id, name) VALUES (1, 'JavaScript')`);
      await pool.query(`INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2)`, ['p1', 1]);

      await pool.query(`DELETE FROM positions WHERE id = 'p1'`);

      const result = await pool.query(`SELECT * FROM position_skills WHERE position_id = 'p1'`);
      expect(result.rows.length).toBe(0);
    });

    it('should cascade delete position_requirements when position is deleted', async () => {
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['p1', 'Developer', 'Company', 'Tel Aviv', 'open', 'Desc', 'HR', 'hr@test.com']
      );
      await pool.query(
        `INSERT INTO position_requirements (id, position_id, text, required) VALUES ($1, $2, $3, $4)`,
        [1, 'p1', '5+ years experience', true]
      );

      await pool.query(`DELETE FROM positions WHERE id = 'p1'`);

      const result = await pool.query(`SELECT * FROM position_requirements WHERE position_id = 'p1'`);
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Unique constraints', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM candidate_skills');
      await pool.query('DELETE FROM position_skills');
      await pool.query('DELETE FROM candidate_languages');
      await pool.query('DELETE FROM skills');
      await pool.query('DELETE FROM languages');
    });

    it('should enforce unique skill names', async () => {
      await pool.query(`INSERT INTO skills (name) VALUES ('JavaScript')`);

      await expect(pool.query(`INSERT INTO skills (name) VALUES ('JavaScript')`)).rejects.toThrow();
    });

    it('should enforce unique language names', async () => {
      await pool.query(`INSERT INTO languages (name) VALUES ('English')`);

      await expect(pool.query(`INSERT INTO languages (name) VALUES ('English')`)).rejects.toThrow();
    });

    it('should enforce unique candidate-skill pairs', async () => {
      await pool.query(
        `INSERT INTO candidates (id, name, email, location, status, summary) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['c1', 'Test', 'test@test.com', 'Tel Aviv', 'active', 'Summary']
      );
      await pool.query(`INSERT INTO skills (id, name) VALUES (1, 'JavaScript')`);
      await pool.query(`INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ('c1', 1)`);

      await expect(
        pool.query(`INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ('c1', 1)`)
      ).rejects.toThrow();
    });

    it('should enforce unique position-skill pairs', async () => {
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['p1', 'Developer', 'Company', 'Tel Aviv', 'open', 'Desc', 'HR', 'hr@test.com']
      );
      await pool.query(`INSERT INTO skills (id, name) VALUES (1, 'JavaScript')`);
      await pool.query(`INSERT INTO position_skills (position_id, skill_id) VALUES ('p1', 1)`);

      await expect(
        pool.query(`INSERT INTO position_skills (position_id, skill_id) VALUES ('p1', 1)`)
      ).rejects.toThrow();
    });
  });
});
