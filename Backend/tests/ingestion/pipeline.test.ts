/**
 * TDD: Tests written BEFORE implementation.
 * These tests define the expected behavior of the ingestion pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pool from '../../src/db.js';
import { processDocument } from '../../src/ingestion/pipeline.js';

// Mock the LLM module
vi.mock('../../src/ingestion/extractors/bedrock.js', () => ({
  invokeNova: vi.fn(),
}));

import { invokeNova } from '../../src/ingestion/extractors/bedrock.js';

describe('Ingestion Pipeline', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean extraction_logs for test isolation
    await pool.query('DELETE FROM extraction_logs');
  });

  afterEach(async () => {
    // Clean up any test data
    await pool.query('DELETE FROM extraction_logs');
  });

  describe('processDocument', () => {
    it('should create extraction log on success', async () => {
      // Mock LLM response
      vi.mocked(invokeNova).mockResolvedValue({
        text: JSON.stringify({
          name: 'Test User',
          skills: [{ name: 'Python', level: 'advanced' }],
          experience: [],
          education: [],
          certifications: [],
          summary: 'Test summary for the candidate profile.',
        }),
        durationMs: 100,
      });

      const result = await processDocument({
        buffer: Buffer.from('Name: Test User\nEmail: test@example.com'),
        fileName: 'test.txt',
        mimeType: 'text/plain',
        type: 'cv',
        dryRun: true, // Don't persist candidate
      });

      expect(result.success).toBe(true);
      expect(result.extractionLogId).toBeDefined();

      // Verify log was created
      const log = await pool.query(
        'SELECT * FROM extraction_logs WHERE id = $1',
        [result.extractionLogId]
      );
      expect(log.rows).toHaveLength(1);
      expect(log.rows[0].status).toBe('success');
    });

    it('should create extraction log on failure', async () => {
      // Mock LLM failure
      vi.mocked(invokeNova).mockResolvedValue({
        text: '',
        durationMs: 50,
        error: 'API timeout',
      });

      const result = await processDocument({
        buffer: Buffer.from('Some CV text'),
        fileName: 'test.txt',
        type: 'cv',
      });

      expect(result.success).toBe(false);
      expect(result.extractionLogId).toBeDefined();

      // Verify log shows failure
      const log = await pool.query(
        'SELECT * FROM extraction_logs WHERE id = $1',
        [result.extractionLogId]
      );
      expect(log.rows[0].status).toBe('failed');
      expect(log.rows[0].error_message).toContain('API timeout');
    });

    it('should use regex result when available', async () => {
      vi.mocked(invokeNova).mockResolvedValue({
        text: JSON.stringify({
          name: 'Test User',
          skills: [],
          experience: [],
          education: [],
          certifications: [],
          summary: 'A valid summary for testing.',
        }),
        durationMs: 100,
      });

      const result = await processDocument({
        buffer: Buffer.from('Email: found@regex.com\nTest User resume'),
        fileName: 'test.txt',
        type: 'cv',
        dryRun: true,
      });

      expect(result.success).toBe(true);

      // Check that regex results were stored
      const log = await pool.query(
        'SELECT regex_results FROM extraction_logs WHERE id = $1',
        [result.extractionLogId]
      );
      const regexResults = JSON.parse(log.rows[0].regex_results);
      expect(regexResults.email).toBe('found@regex.com');
    });

    it('should fail on validation errors', async () => {
      // Mock LLM returns invalid data (missing required summary)
      vi.mocked(invokeNova).mockResolvedValue({
        text: JSON.stringify({
          name: 'Test User',
          skills: [],
          summary: 'short', // Too short
        }),
        durationMs: 100,
      });

      const result = await processDocument({
        buffer: Buffer.from('Test CV'),
        fileName: 'test.txt',
        type: 'cv',
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Summary') || e.includes('summary'))).toBe(true);
    });

    it('should fail on empty document', async () => {
      const result = await processDocument({
        buffer: Buffer.from(''),
        fileName: 'empty.txt',
        type: 'cv',
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('empty'))).toBe(true);
    });
  });
});
