/**
 * Zod validation schemas for LLM output.
 * Treats LLM output as untrusted and validates before persisting.
 */

import { z } from 'zod';

// Valid skill level values
const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];

// Normalize skill level variations from LLM, return null for unknown values
function normalizeSkillLevel(level: string): string | null {
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
  const mapped = mappings[normalized] || normalized;
  // Return null if not a valid level (e.g., "native", "fluent" for languages)
  return validLevels.includes(mapped) ? mapped : null;
}

// Valid skill levels with transformation (returns null for unknown values)
// Lenient: catch any errors and return null
const skillLevelSchema = z.string().transform(normalizeSkillLevel).pipe(
  z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullable()
).catch(null);

// Get current year-month for fallback
function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Normalize date format - keep YYYY if year-only, YYYY-MM if month specified
function normalizeDate(date: string): string {
  // Handle "Present", "Current", etc. in startDate (LLM mistake) - use current date
  if (/^(present|current|now|ongoing)$/i.test(date.trim())) {
    return getCurrentYearMonth();
  }

  // Handle year-only format: "2022" stays as "2022"
  const yearOnly = date.match(/^(\d{4})$/);
  if (yearOnly) {
    return yearOnly[1];
  }

  // Handle YYYY-MM-DD format (extract year-month): "2022-06-15" → "2022-06"
  const fullDate = date.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (fullDate) {
    const [, year, month] = fullDate;
    let monthNum = parseInt(month, 10);
    if (monthNum < 1 || monthNum > 12) return year; // Invalid month, return year only
    return `${year}-${monthNum.toString().padStart(2, '0')}`;
  }

  // Handle YYYY-MM format
  const match = date.match(/^(\d{4})-(\d{2})$/);
  if (!match) return date; // Return as-is if not matching pattern

  const [, year, month] = match;
  let monthNum = parseInt(month, 10);

  // Invalid months - return year only
  if (monthNum < 1 || monthNum > 12) return year;

  return `${year}-${monthNum.toString().padStart(2, '0')}`;
}

// Date format: YYYY or YYYY-MM (keep year-only if no month specified)
// Lenient: if date parsing fails, return current date as fallback
const dateStringSchema = z.string()
  .transform((val) => {
    // Try to normalize
    const normalized = normalizeDate(val);
    // Check if result is valid YYYY or YYYY-MM format
    if (/^\d{4}(-\d{2})?$/.test(normalized)) {
      return normalized;
    }
    // Fallback to current date
    return getCurrentYearMonth();
  })
  .catch(getCurrentYearMonth());

// Handle "Present", "Current", null for end dates
// Keep "Present" as-is for ongoing positions
const endDateSchema = z.union([
  z.string().regex(/^(present|current|now|ongoing)$/i).transform(() => "Present"),
  z.null().transform(() => "Present"),
  dateStringSchema,
]).catch("Present");

// Skill with optional level (only extract if explicitly stated in CV)
// Lenient: name defaults to empty string (will be filtered out later)
const skillSchema = z.object({
  name: z.string().catch(''),
  level: skillLevelSchema.nullable().optional().catch(null),
});

// Work experience
// Lenient: all fields have fallbacks, invalid experiences filtered out later
const experienceSchema = z.object({
  title: z.string().catch(''),
  company: z.string().catch(''),
  startDate: dateStringSchema.catch(getCurrentYearMonth()),
  endDate: endDateSchema,
  highlights: z.array(z.string().catch('')).default([]).catch([]),
});

// Education entry - institution can be null from LLM (will be filtered out later)
// Lenient: all fields have fallbacks, invalid education filtered out later
const educationSchema = z.object({
  degree: z.string().catch(''),
  institution: z.string().nullable().optional().catch(null),
  startDate: dateStringSchema.optional().nullable().catch(null),
  endDate: dateStringSchema.optional().nullable().catch(null),
  status: z.string().optional().nullable().catch(null),
});

// Certification
// Lenient: name defaults to empty (will be filtered out later)
const certificationSchema = z.object({
  name: z.string().catch(''),
  year: z.number().int().min(1900).max(2100).optional().nullable().catch(null),
});

// Language - handle both string and object formats from LLM
// LLM might return "English" or {"name": "English", "level": "native"}
// Lenient: defaults to empty string (will be filtered out later)
const languageSchema = z.union([
  z.string(),
  z.object({ name: z.string() }).transform(obj => obj.name),
]).catch('');

// Full candidate data from LLM
// Lenient: all fields have fallbacks, invalid entries filtered out
export const candidateExtractionSchema = z.object({
  name: z.string().catch('Unknown Candidate'),
  location: z.string().nullable().default(null).catch(null),
  yearsOfExperience: z.number().min(0).max(50).nullable().optional().default(null).catch(null),
  // Filter out skills with empty names
  skills: z.array(skillSchema).default([]).catch([]).transform(
    (arr) => arr.filter((skill) => skill.name && skill.name.trim().length > 0)
  ),
  // Filter out empty language strings
  languages: z.array(languageSchema).default([]).catch([]).transform(
    (arr) => arr.filter((lang) => lang && lang.trim().length > 0)
  ),
  // Filter out experiences with empty title or company
  experience: z.array(experienceSchema).default([]).catch([]).transform(
    (arr) => arr.filter((exp) => exp.title && exp.title.trim().length > 0 && exp.company && exp.company.trim().length > 0)
  ),
  // Filter out education entries with null/empty institution or degree
  education: z.array(educationSchema).default([]).catch([]).transform(
    (arr) => arr.filter((edu) => edu.institution && edu.institution.trim().length > 0 && edu.degree && edu.degree.trim().length > 0)
  ),
  // Filter out certifications with empty names
  certifications: z.array(certificationSchema).default([]).catch([]).transform(
    (arr) => arr.filter((cert) => cert.name && cert.name.trim().length > 0)
  ),
  // Summary: accept string or array, default to generic summary if invalid
  summary: z.union([
    z.string(),
    z.array(z.string()).transform(arr => arr.join(' '))
  ]).catch('').transform((val) => val.trim().length >= 10 ? val : 'Professional candidate with experience in the field.'),
});

export type CandidateExtraction = z.infer<typeof candidateExtractionSchema>;

// Job requirement
// Lenient: text defaults to empty (will be filtered out later)
const requirementSchema = z.object({
  text: z.string().catch(''),
  required: z.boolean().default(true).catch(true),
});

// Keep work type as-is from job description (just clean up formatting)
// Lenient: defaults to undefined if parsing fails
const workTypeSchema = z.string()
  .transform(val => val.toLowerCase().trim())
  .optional()
  .catch(undefined);

// Full job data from LLM
// Lenient: all fields have fallbacks, invalid entries filtered out
export const jobExtractionSchema = z.object({
  title: z.string().catch('Unknown Position'),
  company: z.string().catch('Unknown Company'),
  location: z.string().optional().catch(undefined),
  description: z.string().catch('').transform((val) => val.trim().length >= 10 ? val : 'Position description pending.'),
  // Filter out requirements with empty text
  requirements: z.array(requirementSchema).default([]).catch([]).transform(
    (arr) => arr.filter((req) => req.text && req.text.trim().length > 0)
  ),
  // Filter out empty skill strings
  skills: z.array(z.string().catch('')).default([]).catch([]).transform(
    (arr) => arr.filter((skill) => skill && skill.trim().length > 0)
  ),
  experienceYears: z.number().int().min(0).max(50).optional().catch(undefined),
  workType: workTypeSchema,
  salary: z.string().optional().catch(undefined),
  salaryMin: z.number().int().min(0).optional().catch(undefined),
  salaryMax: z.number().int().min(0).optional().catch(undefined),
  contactName: z.string().optional().catch(undefined),
  contactEmail: z.string().email().optional().catch(undefined),
});

export type JobExtraction = z.infer<typeof jobExtractionSchema>;

/**
 * Validation result with warnings (lenient mode - always succeeds)
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];  // Now used for warnings, not fatal errors
}

/**
 * Validate candidate extraction data from LLM.
 * Lenient mode: always succeeds, returns warnings for defaulted values.
 */
export function validateCandidateData(data: unknown): ValidationResult<CandidateExtraction> {
  // With lenient schema, parse should always succeed
  const result = candidateExtractionSchema.safeParse(data);

  if (result.success) {
    // Collect warnings about defaulted/filtered data
    const warnings: string[] = [];
    const parsed = result.data;

    if (parsed.name === 'Unknown Candidate') {
      warnings.push('name: defaulted to "Unknown Candidate"');
    }
    if (parsed.summary === 'Professional candidate with experience in the field.') {
      warnings.push('summary: defaulted to generic summary');
    }

    return { valid: true, data: parsed, errors: warnings };
  }

  // This should rarely happen with lenient schema, but handle gracefully
  console.warn('Unexpected validation failure in lenient mode:', result.error.errors);

  // Force parse anyway - our schema should handle it
  try {
    const forcedData = candidateExtractionSchema.parse(data ?? {});
    return { valid: true, data: forcedData, errors: ['Forced lenient parsing'] };
  } catch {
    // Absolute fallback - create minimal valid candidate
    const fallbackData: CandidateExtraction = {
      name: 'Unknown Candidate',
      location: null,
      yearsOfExperience: null,
      skills: [],
      languages: [],
      experience: [],
      education: [],
      certifications: [],
      summary: 'Professional candidate with experience in the field.',
    };
    return { valid: true, data: fallbackData, errors: ['Used fallback data - LLM output was unusable'] };
  }
}

/**
 * Validate job extraction data from LLM.
 * Lenient mode: always succeeds, returns warnings for defaulted values.
 */
export function validateJobData(data: unknown): ValidationResult<JobExtraction> {
  // With lenient schema, parse should always succeed
  const result = jobExtractionSchema.safeParse(data);

  if (result.success) {
    // Collect warnings about defaulted data
    const warnings: string[] = [];
    const parsed = result.data;

    if (parsed.title === 'Unknown Position') {
      warnings.push('title: defaulted to "Unknown Position"');
    }
    if (parsed.company === 'Unknown Company') {
      warnings.push('company: defaulted to "Unknown Company"');
    }
    if (parsed.description === 'Position description pending.') {
      warnings.push('description: defaulted to generic description');
    }

    return { valid: true, data: parsed, errors: warnings };
  }

  // This should rarely happen with lenient schema, but handle gracefully
  console.warn('Unexpected validation failure in lenient mode:', result.error.errors);

  // Force parse anyway
  try {
    const forcedData = jobExtractionSchema.parse(data ?? {});
    return { valid: true, data: forcedData, errors: ['Forced lenient parsing'] };
  } catch {
    // Absolute fallback - create minimal valid job
    const fallbackData: JobExtraction = {
      title: 'Unknown Position',
      company: 'Unknown Company',
      description: 'Position description pending.',
      requirements: [],
      skills: [],
    };
    return { valid: true, data: fallbackData, errors: ['Used fallback data - LLM output was unusable'] };
  }
}
