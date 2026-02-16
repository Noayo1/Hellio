import { describe, it, expect } from 'vitest';
import {
  buildCandidateEmbeddingText,
  buildPositionEmbeddingText,
} from '../../src/embeddings/embedding-text';

describe('Embedding Text Builder', () => {
  describe('buildCandidateEmbeddingText', () => {
    it('should build text with all fields', () => {
      const candidate = {
        name: 'John Doe',
        summary: 'Experienced software engineer',
        location: 'Tel Aviv',
        yearsOfExperience: 5,
        skills: [
          { name: 'TypeScript', level: 'advanced' },
          { name: 'React', level: null },
        ],
        languages: ['English', 'Hebrew'],
        experience: [
          {
            title: 'Senior Developer',
            company: 'Tech Corp',
            highlights: ['Led team of 5', 'Increased performance 50%'],
          },
        ],
        education: [{ degree: 'BSc Computer Science', institution: 'TAU' }],
        certifications: [{ name: 'AWS Certified' }],
      };

      const text = buildCandidateEmbeddingText(candidate);

      expect(text).toContain('Candidate: John Doe');
      expect(text).toContain('Summary: Experienced software engineer');
      expect(text).toContain('Location: Tel Aviv');
      expect(text).toContain('Experience: 5 years');
      expect(text).toContain('Skills: TypeScript (advanced), React');
      expect(text).toContain('Languages: English, Hebrew');
      expect(text).toContain('Senior Developer at Tech Corp');
      expect(text).toContain('Led team of 5');
      expect(text).toContain('Education: BSc Computer Science from TAU');
      expect(text).toContain('Certifications: AWS Certified');
    });

    it('should handle missing optional fields gracefully', () => {
      const candidate = {
        name: 'Jane Doe',
        summary: 'Developer',
        location: null,
        yearsOfExperience: null,
        skills: [],
        languages: [],
        experience: [],
        education: [],
        certifications: [],
      };

      const text = buildCandidateEmbeddingText(candidate);

      expect(text).toContain('Candidate: Jane Doe');
      expect(text).toContain('Summary: Developer');
      expect(text).not.toContain('Location:');
      expect(text).not.toContain('Experience:');
      expect(text).not.toContain('Skills:');
    });

    it('should truncate long experience highlights', () => {
      const candidate = {
        name: 'Test User',
        summary: 'Test',
        skills: [],
        languages: [],
        experience: [
          {
            title: 'Developer',
            company: 'Company',
            highlights: ['H1', 'H2', 'H3', 'H4', 'H5'],
          },
        ],
        education: [],
        certifications: [],
      };

      const text = buildCandidateEmbeddingText(candidate);

      // Should only include first 3 highlights
      expect(text).toContain('H1');
      expect(text).toContain('H2');
      expect(text).toContain('H3');
      expect(text).not.toContain('H4');
    });
  });

  describe('buildPositionEmbeddingText', () => {
    it('should build text with all fields', () => {
      const position = {
        title: 'Senior Developer',
        company: 'Tech Corp',
        description: 'Looking for experienced developer',
        location: 'Remote',
        experienceYears: 3,
        workType: 'remote',
        skills: ['TypeScript', 'Node.js'],
        requirements: [
          { text: '3+ years experience', required: true },
          { text: 'Nice communication', required: false },
        ],
      };

      const text = buildPositionEmbeddingText(position);

      expect(text).toContain('Position: Senior Developer at Tech Corp');
      expect(text).toContain('Description: Looking for experienced developer');
      expect(text).toContain('Location: Remote');
      expect(text).toContain('Work Type: remote');
      expect(text).toContain('Required Experience: 3+ years');
      expect(text).toContain('Required Skills: TypeScript, Node.js');
      expect(text).toContain('Must Have: 3+ years experience');
      expect(text).toContain('Nice to Have: Nice communication');
    });

    it('should handle missing optional fields', () => {
      const position = {
        title: 'Developer',
        company: 'Startup',
        description: null,
        location: null,
        experienceYears: null,
        workType: null,
        skills: [],
        requirements: [],
      };

      const text = buildPositionEmbeddingText(position);

      expect(text).toContain('Position: Developer at Startup');
      expect(text).not.toContain('Description:');
      expect(text).not.toContain('Location:');
      expect(text).not.toContain('Required Experience:');
    });

    it('should separate must-have and nice-to-have requirements', () => {
      const position = {
        title: 'Dev',
        company: 'Co',
        skills: [],
        requirements: [
          { text: 'Req 1', required: true },
          { text: 'Req 2', required: true },
          { text: 'Nice 1', required: false },
        ],
      };

      const text = buildPositionEmbeddingText(position);

      expect(text).toContain('Must Have: Req 1; Req 2');
      expect(text).toContain('Nice to Have: Nice 1');
    });
  });
});
