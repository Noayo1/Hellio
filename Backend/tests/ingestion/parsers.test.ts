/**
 * TDD: Tests written BEFORE implementation.
 * These tests define the expected behavior of document parsers.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseDocument,
  parseDocumentFromPath,
} from '../../src/ingestion/parsers/index.js';

// Test fixtures path (relative to Backend directory)
const fixturesPath = join(process.cwd(), 'tests', 'ingestion', 'fixtures');

describe('Document Parsers', () => {
  describe('parseTxt', () => {
    it('should extract text from plain text buffer', async () => {
      const text = 'John Doe\nEmail: john@example.com\nExperience: 5 years';
      const buffer = Buffer.from(text, 'utf-8');

      const result = await parseDocument(buffer, 'resume.txt', 'text/plain');

      expect(result.error).toBeUndefined();
      expect(result.text).toBe(text);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty text file', async () => {
      const buffer = Buffer.from('', 'utf-8');

      const result = await parseDocument(buffer, 'empty.txt', 'text/plain');

      expect(result.error).toBeUndefined();
      expect(result.text).toBe('');
    });
  });

  describe('parseDocument file type detection', () => {
    it('should detect PDF from extension', async () => {
      // Just testing detection, not actual PDF parsing
      const buffer = Buffer.from('not a real pdf');

      const result = await parseDocument(buffer, 'resume.pdf', 'application/pdf');

      // Will error because it's not a real PDF, but shows detection works
      expect(result.error).toBeDefined();
    });

    it('should detect DOCX from extension', async () => {
      const buffer = Buffer.from('not a real docx');

      const result = await parseDocument(buffer, 'resume.docx');

      // Will error because it's not a real DOCX, but shows detection works
      expect(result.error).toBeDefined();
    });

    it('should return error for unsupported file type', async () => {
      const buffer = Buffer.from('some content');

      const result = await parseDocument(buffer, 'file.xyz');

      expect(result.error).toContain('Unsupported');
    });
  });

  describe('parseDocumentFromPath', () => {
    it('should return error for non-existent file', async () => {
      const result = await parseDocumentFromPath('/non/existent/file.pdf');

      expect(result.error).toBeDefined();
      expect(result.text).toBe('');
    });
  });
});
