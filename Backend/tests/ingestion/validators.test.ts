/**
 * TDD: Tests written BEFORE implementation.
 * These tests define the expected behavior of LLM output validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCandidateData,
  validateJobData,
} from '../../src/ingestion/validators/schema.js';

describe('Validators', () => {
  describe('validateCandidateData', () => {
    it('should accept valid candidate data', () => {
      const data = {
        name: 'John Doe',
        skills: [{ name: 'Python', level: 'advanced' }],
        experience: [
          {
            title: 'Developer',
            company: 'Tech Corp',
            startDate: '2020-01',
            endDate: null,
            highlights: ['Built things'],
          },
        ],
        education: [
          {
            degree: 'B.Sc. Computer Science',
            institution: 'Tel Aviv University',
          },
        ],
        certifications: [{ name: 'AWS Certified', year: 2023 }],
        summary: 'Experienced developer with 5 years of experience.',
      };

      const result = validateCandidateData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.name).toBe('John Doe');
    });

    it('should reject missing name', () => {
      const data = {
        name: '',
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        summary: 'A valid summary here.',
      };

      const result = validateCandidateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('name') || e.includes('Name'))).toBe(true);
    });

    it('should reject invalid skill level', () => {
      const data = {
        name: 'John Doe',
        skills: [{ name: 'Python', level: 'super-expert' }],
        experience: [],
        education: [],
        certifications: [],
        summary: 'A valid summary here.',
      };

      const result = validateCandidateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('skill') || e.includes('level'))).toBe(true);
    });

    it('should reject invalid date format', () => {
      const data = {
        name: 'John Doe',
        skills: [],
        experience: [
          {
            title: 'Developer',
            company: 'Tech Corp',
            startDate: 'January 2020',
            endDate: null,
          },
        ],
        education: [],
        certifications: [],
        summary: 'A valid summary here.',
      };

      const result = validateCandidateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('date') || e.includes('Date') || e.includes('YYYY-MM'))).toBe(true);
    });

    it('should reject too short summary', () => {
      const data = {
        name: 'John Doe',
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        summary: 'Short',
      };

      const result = validateCandidateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('summary') || e.includes('Summary'))).toBe(true);
    });

    it('should default empty arrays', () => {
      const data = {
        name: 'John Doe',
        summary: 'A valid summary for the candidate.',
      };

      const result = validateCandidateData(data);

      expect(result.valid).toBe(true);
      expect(result.data?.skills).toEqual([]);
      expect(result.data?.experience).toEqual([]);
    });
  });

  describe('validateJobData', () => {
    it('should accept valid job data', () => {
      const data = {
        title: 'Senior Developer',
        company: 'Tech Corp',
        location: 'Tel Aviv',
        description: 'Looking for an experienced developer to join our team.',
        requirements: [
          { text: '5+ years experience', required: true },
        ],
        skills: ['Python', 'AWS'],
        experienceYears: 5,
        workType: 'hybrid',
      };

      const result = validateJobData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.title).toBe('Senior Developer');
    });

    it('should reject missing title', () => {
      const data = {
        title: '',
        company: 'Tech Corp',
        description: 'A valid job description here.',
      };

      const result = validateJobData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('title') || e.includes('Title'))).toBe(true);
    });

    it('should reject invalid work type', () => {
      const data = {
        title: 'Developer',
        company: 'Tech Corp',
        description: 'A valid job description here.',
        workType: 'flexible',
      };

      const result = validateJobData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('workType'))).toBe(true);
    });
  });
});
