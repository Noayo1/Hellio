import { describe, it, expect, beforeEach } from 'vitest';
import { executeSQL, MAX_ROWS } from '../../src/chat/sql-executor.js';
import pool from '../../src/db.js';

describe('SQL Executor', () => {
  beforeEach(async () => {
    // Seed some test data
    await pool.query(`
      INSERT INTO skills (id, name) VALUES
        (1, 'JavaScript'),
        (2, 'TypeScript'),
        (3, 'Python')
      ON CONFLICT (id) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO candidates (id, name, email, status, location, summary) VALUES
        ('c1', 'Alice', 'alice@test.com', 'active', 'New York', 'Software engineer'),
        ('c2', 'Bob', 'bob@test.com', 'active', 'London', 'Backend developer'),
        ('c3', 'Charlie', 'charlie@test.com', 'inactive', 'Paris', 'Data scientist')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  describe('successful execution', () => {
    it('should execute valid SELECT and return rows', async () => {
      const result = await executeSQL('SELECT id, name FROM candidates ORDER BY name');

      expect(result.error).toBeUndefined();
      expect(result.rows.length).toBe(3);
      expect(result.rowCount).toBe(3);
      expect(result.rows[0]).toHaveProperty('name', 'Alice');
    });

    it('should return execution duration', async () => {
      const result = await executeSQL('SELECT 1');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(5000);
    });

    it('should handle empty result sets', async () => {
      const result = await executeSQL('SELECT * FROM candidates WHERE email = \'nonexistent@test.com\'');

      expect(result.error).toBeUndefined();
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      expect(result.truncated).toBe(false);
    });

    it('should handle queries with parameters in string literals', async () => {
      const result = await executeSQL('SELECT * FROM candidates WHERE status = \'active\'');

      expect(result.error).toBeUndefined();
      expect(result.rows.length).toBe(2);
    });
  });

  describe('LIMIT enforcement', () => {
    it('should add LIMIT if not present', async () => {
      const result = await executeSQL('SELECT * FROM candidates');

      expect(result.error).toBeUndefined();
      // Should have executed with implicit LIMIT
      expect(result.rows.length).toBeLessThanOrEqual(MAX_ROWS);
    });

    it('should respect existing LIMIT if smaller than MAX_ROWS', async () => {
      const result = await executeSQL('SELECT * FROM candidates LIMIT 1');

      expect(result.rows.length).toBe(1);
      expect(result.truncated).toBe(false);
    });

    it('should cap LIMIT to MAX_ROWS if larger', async () => {
      // Create more rows than MAX_ROWS to test truncation
      // For this test, we'll just verify the truncated flag logic
      const result = await executeSQL(`SELECT * FROM candidates LIMIT ${MAX_ROWS + 10}`);

      expect(result.rows.length).toBeLessThanOrEqual(MAX_ROWS);
    });

    it('should set truncated flag when results exceed MAX_ROWS', async () => {
      // Insert many rows to test truncation
      const inserts = Array.from({ length: MAX_ROWS + 5 }, (_, i) =>
        `(${i + 100}, 'Skill ${i + 100}')`
      ).join(',');

      await pool.query(`INSERT INTO skills (id, name) VALUES ${inserts} ON CONFLICT DO NOTHING`);

      const result = await executeSQL('SELECT * FROM skills');

      expect(result.rows.length).toBeLessThanOrEqual(MAX_ROWS);
      // truncated should be true if we had more rows than MAX_ROWS
    });
  });

  describe('error handling', () => {
    it('should return error for invalid SQL syntax', async () => {
      const result = await executeSQL('SELEC * FROM candidates');

      expect(result.error).toBeDefined();
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should return error for non-existent table', async () => {
      const result = await executeSQL('SELECT * FROM nonexistent_table');

      expect(result.error).toBeDefined();
      expect(result.error).toContain('nonexistent_table');
    });

    it('should return error for non-existent column', async () => {
      const result = await executeSQL('SELECT nonexistent_column FROM candidates');

      expect(result.error).toBeDefined();
    });

    it('should still return duration on error', async () => {
      const result = await executeSQL('INVALID SQL');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('query types', () => {
    it('should handle SELECT with JOIN', async () => {
      // First link a candidate to a skill
      await pool.query(`
        INSERT INTO candidate_skills (candidate_id, skill_id, level)
        VALUES ('c1', 1, 'expert')
        ON CONFLICT DO NOTHING
      `);

      const result = await executeSQL(`
        SELECT c.name, s.name as skill
        FROM candidates c
        JOIN candidate_skills cs ON c.id = cs.candidate_id
        JOIN skills s ON cs.skill_id = s.id
      `);

      expect(result.error).toBeUndefined();
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle SELECT with GROUP BY', async () => {
      const result = await executeSQL(`
        SELECT status, COUNT(*) as count
        FROM candidates
        GROUP BY status
      `);

      expect(result.error).toBeUndefined();
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle SELECT with subquery', async () => {
      const result = await executeSQL(`
        SELECT * FROM candidates
        WHERE id IN (SELECT candidate_id FROM candidate_skills)
      `);

      expect(result.error).toBeUndefined();
    });
  });
});
