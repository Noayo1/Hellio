/**
 * TDD: Tests written BEFORE implementation.
 * These tests define the expected behavior of regex extraction.
 */

import { describe, it, expect } from 'vitest';
import {
  extractEmail,
  extractPhone,
  extractLinkedIn,
  extractGitHub,
  extractWithRegex,
} from '../../src/ingestion/extractors/regex.js';

describe('Regex Extractors', () => {
  describe('extractEmail', () => {
    it('should extract standard email', () => {
      expect(extractEmail('Contact: john@example.com')).toBe('john@example.com');
    });

    it('should extract email with subdomain', () => {
      expect(extractEmail('Email: user@mail.company.co.il')).toBe('user@mail.company.co.il');
    });

    it('should extract first email when multiple present', () => {
      expect(extractEmail('john@a.com or jane@b.com')).toBe('john@a.com');
    });

    it('should return null when no email found', () => {
      expect(extractEmail('No email here')).toBeNull();
    });

    it('should handle email with plus sign', () => {
      expect(extractEmail('test+tag@gmail.com')).toBe('test+tag@gmail.com');
    });

    it('should lowercase email', () => {
      expect(extractEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
    });
  });

  describe('extractPhone', () => {
    it('should extract Israeli mobile with dashes', () => {
      expect(extractPhone('Call me: 050-123-4567')).toBe('050-123-4567');
    });

    it('should extract Israeli mobile without dashes', () => {
      expect(extractPhone('Phone: 0501234567')).toBe('0501234567');
    });

    it('should extract +972 format', () => {
      expect(extractPhone('+972-50-123-4567')).toBe('+972-50-123-4567');
    });

    it('should extract landline number', () => {
      expect(extractPhone('Office: 03-123-4567')).toBe('03-123-4567');
    });

    it('should return null when no phone found', () => {
      expect(extractPhone('No phone here')).toBeNull();
    });
  });

  describe('extractLinkedIn', () => {
    it('should extract LinkedIn URL with https', () => {
      expect(extractLinkedIn('https://linkedin.com/in/john-doe')).toBe(
        'https://linkedin.com/in/john-doe'
      );
    });

    it('should extract LinkedIn URL without protocol', () => {
      expect(extractLinkedIn('linkedin.com/in/john-doe')).toBe(
        'https://linkedin.com/in/john-doe'
      );
    });

    it('should extract LinkedIn URL with www', () => {
      expect(extractLinkedIn('www.linkedin.com/in/john-doe')).toBe(
        'https://linkedin.com/in/john-doe'
      );
    });

    it('should return null when no LinkedIn found', () => {
      expect(extractLinkedIn('No LinkedIn here')).toBeNull();
    });
  });

  describe('extractGitHub', () => {
    it('should extract GitHub URL with https', () => {
      expect(extractGitHub('https://github.com/johndoe')).toBe(
        'https://github.com/johndoe'
      );
    });

    it('should extract GitHub URL without protocol', () => {
      expect(extractGitHub('github.com/johndoe')).toBe('https://github.com/johndoe');
    });

    it('should return null when no GitHub found', () => {
      expect(extractGitHub('No GitHub here')).toBeNull();
    });
  });

  describe('extractWithRegex', () => {
    it('should extract all fields from CV text', () => {
      const cvText = `
        John Doe
        Email: john.doe@example.com
        Phone: 050-123-4567
        LinkedIn: linkedin.com/in/johndoe
        GitHub: github.com/johndoe
      `;

      const result = extractWithRegex(cvText);

      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('050-123-4567');
      expect(result.linkedin).toBe('https://linkedin.com/in/johndoe');
      expect(result.github).toBe('https://github.com/johndoe');
    });

    it('should return nulls for missing fields', () => {
      const cvText = 'Just some text without contact info';

      const result = extractWithRegex(cvText);

      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.linkedin).toBeNull();
      expect(result.github).toBeNull();
    });
  });
});
