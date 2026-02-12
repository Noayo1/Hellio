import { describe, it, expect } from 'vitest';
import { validateSQL } from '../../src/chat/sql-validator.js';

describe('SQL Validator', () => {
  describe('valid queries', () => {
    it('should accept simple SELECT query', () => {
      const result = validateSQL('SELECT * FROM candidates');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept SELECT with WHERE clause', () => {
      const result = validateSQL('SELECT name, email FROM candidates WHERE status = \'active\'');
      expect(result.valid).toBe(true);
    });

    it('should accept SELECT with JOIN', () => {
      const result = validateSQL(`
        SELECT c.name, s.name as skill
        FROM candidates c
        JOIN candidate_skills cs ON c.id = cs.candidate_id
        JOIN skills s ON cs.skill_id = s.id
      `);
      expect(result.valid).toBe(true);
    });

    it('should accept SELECT with GROUP BY and HAVING', () => {
      const result = validateSQL(`
        SELECT position_id, COUNT(*) as count
        FROM candidate_positions
        GROUP BY position_id
        HAVING COUNT(*) > 5
      `);
      expect(result.valid).toBe(true);
    });

    it('should accept lowercase select', () => {
      const result = validateSQL('select * from candidates');
      expect(result.valid).toBe(true);
    });

    it('should accept SELECT with LIMIT', () => {
      const result = validateSQL('SELECT * FROM candidates LIMIT 10');
      expect(result.valid).toBe(true);
    });

    it('should normalize whitespace', () => {
      const result = validateSQL('  SELECT * FROM candidates  ');
      expect(result.valid).toBe(true);
      expect(result.normalizedSQL).toBe('SELECT * FROM candidates');
    });
  });

  describe('destructive queries', () => {
    it('should reject INSERT query', () => {
      const result = validateSQL('INSERT INTO candidates (name) VALUES (\'test\')');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should reject UPDATE query', () => {
      const result = validateSQL('UPDATE candidates SET name = \'test\'');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should reject DELETE query', () => {
      const result = validateSQL('DELETE FROM candidates WHERE id = 1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should reject DROP query', () => {
      const result = validateSQL('DROP TABLE candidates');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should reject TRUNCATE query', () => {
      const result = validateSQL('TRUNCATE TABLE candidates');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should reject ALTER query', () => {
      const result = validateSQL('ALTER TABLE candidates ADD COLUMN foo VARCHAR');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should reject CREATE query', () => {
      const result = validateSQL('CREATE TABLE test (id INT)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SELECT');
    });
  });

  describe('hidden destructive keywords', () => {
    it('should reject SELECT with DROP in subquery', () => {
      const result = validateSQL('SELECT * FROM candidates; DROP TABLE users');
      expect(result.valid).toBe(false);
    });

    it('should reject SELECT followed by DELETE', () => {
      const result = validateSQL('SELECT 1; DELETE FROM candidates');
      expect(result.valid).toBe(false);
    });

    it('should reject GRANT keyword', () => {
      const result = validateSQL('SELECT 1; GRANT ALL ON candidates TO public');
      expect(result.valid).toBe(false);
    });

    it('should reject REVOKE keyword', () => {
      const result = validateSQL('SELECT 1; REVOKE ALL ON candidates FROM public');
      expect(result.valid).toBe(false);
    });
  });

  describe('multiple statements', () => {
    it('should reject semicolon followed by another statement', () => {
      const result = validateSQL('SELECT * FROM candidates; SELECT * FROM positions');
      expect(result.valid).toBe(false);
      expect(result.error?.toLowerCase()).toContain('multiple');
    });

    it('should allow trailing semicolon', () => {
      const result = validateSQL('SELECT * FROM candidates;');
      expect(result.valid).toBe(true);
    });

    it('should allow semicolon with only whitespace after', () => {
      const result = validateSQL('SELECT * FROM candidates;   ');
      expect(result.valid).toBe(true);
    });
  });

  describe('SQL comments', () => {
    it('should reject single-line comments', () => {
      const result = validateSQL('SELECT * FROM candidates -- WHERE id = 1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('comment');
    });

    it('should reject block comments', () => {
      const result = validateSQL('SELECT * FROM candidates /* WHERE id = 1 */');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('comment');
    });
  });

  describe('system tables', () => {
    it('should reject queries accessing pg_ tables', () => {
      const result = validateSQL('SELECT * FROM pg_catalog.pg_tables');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('system');
    });

    it('should reject queries accessing information_schema', () => {
      const result = validateSQL('SELECT * FROM information_schema.tables');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('system');
    });
  });

  describe('query length', () => {
    it('should reject queries exceeding max length', () => {
      const longQuery = 'SELECT * FROM candidates WHERE name IN (' +
        Array(500).fill('\'test\'').join(',') + ')';
      const result = validateSQL(longQuery);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('long');
    });

    it('should accept queries within max length', () => {
      const result = validateSQL('SELECT * FROM candidates WHERE id = 1');
      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should reject empty query', () => {
      const result = validateSQL('');
      expect(result.valid).toBe(false);
    });

    it('should reject whitespace-only query', () => {
      const result = validateSQL('   ');
      expect(result.valid).toBe(false);
    });

    it('should handle query with newlines', () => {
      const result = validateSQL('SELECT\n*\nFROM\ncandidates');
      expect(result.valid).toBe(true);
    });
  });
});
