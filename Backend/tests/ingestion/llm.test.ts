/**
 * TDD: Tests written BEFORE implementation.
 * These tests define the expected behavior of LLM extraction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractCandidateWithLLM,
  extractJobWithLLM,
  parseJsonResponse,
} from '../../src/ingestion/extractors/llm.js';

// Mock the bedrock module
vi.mock('../../src/ingestion/extractors/bedrock.js', () => ({
  invokeNova: vi.fn(),
}));

import { invokeNova } from '../../src/ingestion/extractors/bedrock.js';

describe('LLM Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseJsonResponse', () => {
    it('should parse clean JSON', () => {
      const json = '{"name": "John Doe", "skills": []}';
      const result = parseJsonResponse(json);

      expect(result).toEqual({ name: 'John Doe', skills: [] });
    });

    it('should handle markdown code blocks', () => {
      const json = '```json\n{"name": "John Doe"}\n```';
      const result = parseJsonResponse(json);

      expect(result).toEqual({ name: 'John Doe' });
    });

    it('should handle code blocks without language', () => {
      const json = '```\n{"name": "John Doe"}\n```';
      const result = parseJsonResponse(json);

      expect(result).toEqual({ name: 'John Doe' });
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseJsonResponse('not json')).toThrow();
    });
  });

  describe('extractCandidateWithLLM', () => {
    it('should extract candidate data from CV text', async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: 'John Doe',
          skills: [{ name: 'Python', level: 'advanced' }],
          experience: [],
          education: [],
          certifications: [],
          summary: 'Experienced developer.',
        }),
        durationMs: 100,
      };

      vi.mocked(invokeNova).mockResolvedValue(mockResponse);

      const result = await extractCandidateWithLLM('CV text here');

      expect(result.error).toBeUndefined();
      expect(result.data?.name).toBe('John Doe');
      expect(result.data?.skills).toHaveLength(1);
      expect(result.rawResponse).toBe(mockResponse.text);
    });

    it('should return error when LLM fails', async () => {
      vi.mocked(invokeNova).mockResolvedValue({
        text: '',
        durationMs: 50,
        error: 'API timeout',
      });

      const result = await extractCandidateWithLLM('CV text');

      expect(result.error).toBe('API timeout');
      expect(result.data).toBeNull();
    });

    it('should return error for malformed JSON response', async () => {
      vi.mocked(invokeNova).mockResolvedValue({
        text: 'This is not valid JSON',
        durationMs: 100,
      });

      const result = await extractCandidateWithLLM('CV text');

      expect(result.error).toContain('parse');
      expect(result.data).toBeNull();
    });
  });

  describe('extractJobWithLLM', () => {
    it('should extract job data from description text', async () => {
      const mockResponse = {
        text: JSON.stringify({
          title: 'Senior Developer',
          company: 'Tech Corp',
          description: 'Looking for a developer.',
          requirements: [],
          skills: ['Python'],
        }),
        durationMs: 100,
      };

      vi.mocked(invokeNova).mockResolvedValue(mockResponse);

      const result = await extractJobWithLLM('Job description text');

      expect(result.error).toBeUndefined();
      expect(result.data?.title).toBe('Senior Developer');
      expect(result.data?.skills).toContain('Python');
    });
  });
});
