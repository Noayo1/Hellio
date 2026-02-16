/**
 * Database persistence for ingested candidates and jobs.
 */

import pool from '../db.js';
import type { CandidateExtraction, JobExtraction } from './validators/schema.js';
import type { RegexResults } from './extractors/regex.js';

/**
 * Generate a unique ID with the given prefix.
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Calculate years of experience from the most recent position.
 * Uses only the first experience (sort_order = 0) which is the current/most recent role.
 * Calculates based on years only (no months/days).
 */
async function calculateYearsFromExperiences(candidateId: string): Promise<number | null> {
  // Get only the most recent position (sort_order = 0)
  const result = await pool.query(
    'SELECT start_date, end_date FROM experiences WHERE candidate_id = $1 ORDER BY sort_order LIMIT 1',
    [candidateId]
  );

  if (result.rows.length === 0 || !result.rows[0].start_date) return null;

  const { start_date, end_date } = result.rows[0];

  // Extract start year
  const startYear = parseInt(start_date.substring(0, 4));
  if (isNaN(startYear)) return null;

  // Extract end year (use current year for "Present" or null)
  let endYear: number;
  if (!end_date || end_date.toLowerCase() === 'present') {
    endYear = new Date().getFullYear();
  } else {
    endYear = parseInt(end_date.substring(0, 4));
    if (isNaN(endYear)) return null;
  }

  // Simple year subtraction
  const years = endYear - startYear;
  return Math.max(0, years);
}

/**
 * Get or create a record in a lookup table by name.
 * Truncates name to maxLength to fit column constraint.
 */
async function getOrCreateLookup(
  table: 'skills' | 'languages',
  name: string,
  maxLength: number
): Promise<number> {
  const truncatedName = name.slice(0, maxLength);
  const result = await pool.query(
    `INSERT INTO ${table} (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [truncatedName]
  );
  return result.rows[0].id;
}

/**
 * Create extraction log entry.
 */
export async function createExtractionLog(
  sourceFilePath: string,
  sourceType: 'cv' | 'job'
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO extraction_logs (source_file_path, source_type, status)
     VALUES ($1, $2, 'pending')
     RETURNING id`,
    [sourceFilePath, sourceType]
  );
  return result.rows[0].id;
}

/** Field mappings: property name -> [db column, needs JSON stringify] */
const EXTRACTION_LOG_FIELDS: Record<string, [string, boolean]> = {
  status: ['status', false],
  rawText: ['raw_text', false],
  regexResults: ['regex_results', true],
  llmRawResponse: ['llm_raw_response', false],
  llmParsedData: ['llm_parsed_data', true],
  validationErrors: ['validation_errors', true],
  errorMessage: ['error_message', false],
  parseDurationMs: ['parse_duration_ms', false],
  llmDurationMs: ['llm_duration_ms', false],
  totalDurationMs: ['total_duration_ms', false],
  candidateId: ['candidate_id', false],
  fileId: ['file_id', false],
  promptVersion: ['prompt_version', false],
};

type ExtractionLogUpdates = {
  status?: string;
  rawText?: string;
  regexResults?: RegexResults;
  llmRawResponse?: string;
  llmParsedData?: unknown;
  validationErrors?: string[];
  errorMessage?: string;
  parseDurationMs?: number;
  llmDurationMs?: number;
  totalDurationMs?: number;
  candidateId?: string;
  fileId?: string;
  promptVersion?: string;
};

/**
 * Update extraction log with data.
 */
export async function updateExtractionLog(
  logId: string,
  updates: ExtractionLogUpdates
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const fieldConfig = EXTRACTION_LOG_FIELDS[key];
    if (!fieldConfig) continue;

    const [column, needsStringify] = fieldConfig;
    setClauses.push(`${column} = $${setClauses.length + 1}`);
    values.push(needsStringify ? JSON.stringify(value) : value);
  }

  if (setClauses.length === 0) return;

  values.push(logId);
  await pool.query(
    `UPDATE extraction_logs SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
    values
  );
}

/**
 * Insert related data (skills, languages, experience, education, certifications).
 * Used by both create and update paths.
 */
async function insertCandidateRelatedData(
  candidateId: string,
  data: CandidateExtraction
): Promise<void> {
  for (const skill of data.skills) {
    const skillId = await getOrCreateLookup('skills', skill.name, 100);
    await pool.query(
      `INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [candidateId, skillId, skill.level]
    );
  }

  for (const language of data.languages) {
    const languageId = await getOrCreateLookup('languages', language, 50);
    await pool.query(
      `INSERT INTO candidate_languages (candidate_id, language_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [candidateId, languageId]
    );
  }

  for (let i = 0; i < data.experience.length; i++) {
    const exp = data.experience[i];
    const expResult = await pool.query(
      `INSERT INTO experiences (candidate_id, title, company, location, start_date, end_date, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [candidateId, exp.title, exp.company, null, exp.startDate || null, exp.endDate || null, i]
    );
    const expId = expResult.rows[0].id;

    for (let j = 0; j < exp.highlights.length; j++) {
      await pool.query(
        `INSERT INTO experience_highlights (experience_id, highlight, sort_order) VALUES ($1, $2, $3)`,
        [expId, exp.highlights[j], j]
      );
    }
  }

  for (let i = 0; i < data.education.length; i++) {
    const edu = data.education[i];
    await pool.query(
      `INSERT INTO education (candidate_id, degree, institution, start_date, end_date, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [candidateId, edu.degree, edu.institution, edu.startDate || null, edu.endDate || null, edu.status || null, i]
    );
  }

  for (let i = 0; i < data.certifications.length; i++) {
    const cert = data.certifications[i];
    await pool.query(
      `INSERT INTO certifications (candidate_id, name, year, sort_order) VALUES ($1, $2, $3, $4)`,
      [candidateId, cert.name, cert.year || null, i]
    );
  }
}

/**
 * Delete all related data for a candidate (for update/refresh).
 */
async function deleteCandidateRelatedData(candidateId: string): Promise<void> {
  // Delete in order respecting FK constraints
  // experience_highlights is deleted via CASCADE from experiences
  await pool.query('DELETE FROM experiences WHERE candidate_id = $1', [candidateId]);
  await pool.query('DELETE FROM education WHERE candidate_id = $1', [candidateId]);
  await pool.query('DELETE FROM certifications WHERE candidate_id = $1', [candidateId]);
  await pool.query('DELETE FROM candidate_skills WHERE candidate_id = $1', [candidateId]);
  await pool.query('DELETE FROM candidate_languages WHERE candidate_id = $1', [candidateId]);
}

/**
 * Persist candidate data to database.
 * Uses email-based deduplication: updates existing candidate if email matches,
 * creates new candidate otherwise. Maintains CV version history.
 */
export async function persistCandidate(
  data: CandidateExtraction,
  regexResults: RegexResults,
  extractionLogId: string,
  fileBuffer?: Buffer,
  fileName?: string
): Promise<string> {
  const email = regexResults.email || `temp_${Date.now()}@unknown.com`;
  // Heuristic wins: prefer regex-extracted name over LLM
  const name = regexResults.candidateName || data.name;

  // Check if candidate with this email already exists
  const existing = await pool.query(
    'SELECT id FROM candidates WHERE email = $1',
    [email]
  );

  let candidateId: string;
  let isUpdate = false;

  if (existing.rows.length > 0) {
    // UPDATE existing candidate
    candidateId = existing.rows[0].id;
    isUpdate = true;

    // Update candidate core data
    await pool.query(
      `UPDATE candidates SET
        name = $1,
        phone = $2,
        location = $3,
        linkedin = $4,
        github = $5,
        summary = $6,
        years_of_experience = $7,
        extraction_log_id = $8,
        updated_at = NOW()
       WHERE id = $9`,
      [
        name,
        regexResults.phone,
        data.location || 'Unknown',
        regexResults.linkedin,
        regexResults.github,
        data.summary,
        data.yearsOfExperience,
        extractionLogId,
        candidateId,
      ]
    );

    // Delete old related data and re-insert (simpler than diffing)
    await deleteCandidateRelatedData(candidateId);

    console.log(`Updated existing candidate: ${candidateId} (${email})`);
  } else {
    // CREATE new candidate
    candidateId = generateId('cand');

    await pool.query(
      `INSERT INTO candidates (id, name, email, phone, location, linkedin, github, status, summary, years_of_experience, extraction_log_id, extraction_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        candidateId,
        name,
        email,
        regexResults.phone,
        data.location || 'Unknown',
        regexResults.linkedin,
        regexResults.github,
        'active',
        data.summary,
        data.yearsOfExperience,
        extractionLogId,
        'ingestion',
      ]
    );

    console.log(`Created new candidate: ${candidateId} (${email})`);
  }

  // Insert related data (skills, experience, education, etc.)
  await insertCandidateRelatedData(candidateId, data);

  // Calculate years_of_experience from work history if not provided by LLM
  if (!data.yearsOfExperience) {
    const calculatedYears = await calculateYearsFromExperiences(candidateId);
    if (calculatedYears !== null) {
      await pool.query(
        'UPDATE candidates SET years_of_experience = $1 WHERE id = $2',
        [calculatedYears, candidateId]
      );
    }
  }

  // Handle file upload with versioning
  if (fileBuffer && fileName) {
    const mimeType = fileName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isUpdate) {
      // Mark existing CVs as not current
      await pool.query(
        'UPDATE files SET is_current = false WHERE candidate_id = $1 AND file_type = $2',
        [candidateId, 'cv']
      );

      // Get next version number
      const versionResult = await pool.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM files WHERE candidate_id = $1',
        [candidateId]
      );
      const nextVersion = versionResult.rows[0].next_version;

      // Insert new CV as current version
      const fileResult = await pool.query(
        `INSERT INTO files (candidate_id, file_name, file_type, mime_type, content, version_number, is_current)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [candidateId, fileName, 'cv', mimeType, fileBuffer, nextVersion, true]
      );
      await updateExtractionLog(extractionLogId, { fileId: fileResult.rows[0].id });

      console.log(`Added CV version ${nextVersion} for candidate ${candidateId}`);
    } else {
      // New candidate - version 1
      const fileResult = await pool.query(
        `INSERT INTO files (candidate_id, file_name, file_type, mime_type, content, version_number, is_current)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [candidateId, fileName, 'cv', mimeType, fileBuffer, 1, true]
      );
      await updateExtractionLog(extractionLogId, { fileId: fileResult.rows[0].id });
    }
  }

  return candidateId;
}

/**
 * Persist job data to database.
 */
export async function persistJob(
  data: JobExtraction,
  regexResults: RegexResults,
  extractionLogId: string
): Promise<string> {
  const positionId = generateId('pos');
  const contactEmail = regexResults.contactEmail || data.contactEmail || 'hr@company.com';
  const contactName = regexResults.contactName || data.contactName || 'HR Department';
  const title = regexResults.jobTitle || data.title;

  await pool.query(
    `INSERT INTO positions (id, title, company, location, status, description, experience_years, work_type, salary, salary_min, salary_max, contact_name, contact_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      positionId,
      title,
      data.company,
      data.location || 'Not specified',
      'open',
      data.description,
      data.experienceYears || 0,
      data.workType || 'hybrid',
      data.salary || null,
      data.salaryMin || null,
      data.salaryMax || null,
      contactName,
      contactEmail,
    ]
  );

  for (const skillName of data.skills) {
    const skillId = await getOrCreateLookup('skills', skillName, 100);
    await pool.query(
      `INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [positionId, skillId]
    );
  }

  for (let i = 0; i < data.requirements.length; i++) {
    const req = data.requirements[i];
    await pool.query(
      `INSERT INTO position_requirements (position_id, text, required, sort_order) VALUES ($1, $2, $3, $4)`,
      [positionId, req.text, req.required, i]
    );
  }

  return positionId;
}
