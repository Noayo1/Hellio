/**
 * Zod validation schemas for LLM output.
 * Treats LLM output as untrusted and validates before persisting.
 */

import { z } from 'zod';

// Normalize skill level variations from LLM
function normalizeSkillLevel(level: string): string {
  const normalized = level.toLowerCase().trim();
  const mappings: Record<string, string> = {
    // Beginner variations
    'basics': 'beginner',
    'basic': 'beginner',
    'novice': 'beginner',
    'entry': 'beginner',
    'entry-level': 'beginner',
    'junior': 'beginner',
    'learning': 'beginner',
    'fundamental': 'beginner',
    // Intermediate variations
    'mid': 'intermediate',
    'mid-level': 'intermediate',
    'moderate': 'intermediate',
    'competent': 'intermediate',
    'proficient': 'intermediate',
    // Advanced variations
    'senior': 'advanced',
    'experienced': 'advanced',
    'strong': 'advanced',
    // Expert variations
    'master': 'expert',
    'professional': 'expert',
    'specialist': 'expert',
  };
  return mappings[normalized] || normalized;
}

// Valid skill levels with transformation
const skillLevelSchema = z.string().transform(normalizeSkillLevel).pipe(
  z.enum(['beginner', 'intermediate', 'advanced', 'expert'])
);

// Normalize and validate date format: YYYY-MM
function normalizeDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})$/);
  if (!match) return date; // Let validation fail if not matching pattern

  const [, year, month] = match;
  let monthNum = parseInt(month, 10);

  // Fix invalid months (00 -> 01, 13+ -> 12)
  if (monthNum < 1) monthNum = 1;
  if (monthNum > 12) monthNum = 12;

  return `${year}-${monthNum.toString().padStart(2, '0')}`;
}

// Date format: YYYY-MM with normalization
const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}$/, 'Date must be YYYY-MM format')
  .transform(normalizeDate);

// Skill with level
const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: skillLevelSchema,
});

// Work experience
const experienceSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  startDate: dateStringSchema,
  endDate: dateStringSchema.nullable(),
  highlights: z.array(z.string()).default([]),
});

// Education entry
const educationSchema = z.object({
  degree: z.string().min(1, 'Degree is required'),
  institution: z.string().min(1, 'Institution is required'),
  startDate: dateStringSchema.optional().nullable(),
  endDate: dateStringSchema.optional().nullable(),
  status: z.string().optional(),
});

// Certification
const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
});

// Full candidate data from LLM
export const candidateExtractionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  skills: z.array(skillSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
});

export type CandidateExtraction = z.infer<typeof candidateExtractionSchema>;

// Job requirement
const requirementSchema = z.object({
  text: z.string().min(1, 'Requirement text is required'),
  required: z.boolean().default(true),
});

// Full job data from LLM
export const jobExtractionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  company: z.string().min(1, 'Company is required'),
  location: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requirements: z.array(requirementSchema).default([]),
  skills: z.array(z.string()).default([]),
  experienceYears: z.number().int().min(0).max(50).optional(),
  workType: z.enum(['remote', 'onsite', 'hybrid']).optional(),
  salary: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export type JobExtraction = z.infer<typeof jobExtractionSchema>;

/**
 * Validation result with errors
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validate candidate extraction data from LLM
 */
export function validateCandidateData(data: unknown): ValidationResult<CandidateExtraction> {
  const result = candidateExtractionSchema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data, errors: [] };
  }

  const errors = result.error.errors.map(
    (e) => `${e.path.join('.')}: ${e.message}`
  );

  return { valid: false, errors };
}

/**
 * Validate job extraction data from LLM
 */
export function validateJobData(data: unknown): ValidationResult<JobExtraction> {
  const result = jobExtractionSchema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data, errors: [] };
  }

  const errors = result.error.errors.map(
    (e) => `${e.path.join('.')}: ${e.message}`
  );

  return { valid: false, errors };
}
