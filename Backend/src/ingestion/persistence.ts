/**
 * Database persistence for ingested candidates and jobs.
 */

import pool from '../db.js';
import type { CandidateExtraction, JobExtraction } from './validators/schema.js';
import type { RegexResults } from './extractors/regex.js';

/**
 * Generate a unique candidate ID.
 */
function generateCandidateId(): string {
  return `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convert "YYYY-MM" to "YYYY-MM-01" for DATE type.
 */
function toDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  return dateStr;
}

/**
 * Get or create a skill by name.
 */
async function getOrCreateSkill(skillName: string): Promise<number> {
  const result = await pool.query(
    `INSERT INTO skills (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [skillName]
  );
  return result.rows[0].id;
}

/**
 * Get or create a language by name.
 */
async function getOrCreateLanguage(languageName: string): Promise<number> {
  const result = await pool.query(
    `INSERT INTO languages (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [languageName]
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

/**
 * Update extraction log with data.
 */
export async function updateExtractionLog(
  logId: string,
  updates: {
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
  }
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.rawText !== undefined) {
    setClauses.push(`raw_text = $${paramIndex++}`);
    values.push(updates.rawText);
  }
  if (updates.regexResults !== undefined) {
    setClauses.push(`regex_results = $${paramIndex++}`);
    values.push(JSON.stringify(updates.regexResults));
  }
  if (updates.llmRawResponse !== undefined) {
    setClauses.push(`llm_raw_response = $${paramIndex++}`);
    values.push(updates.llmRawResponse);
  }
  if (updates.llmParsedData !== undefined) {
    setClauses.push(`llm_parsed_data = $${paramIndex++}`);
    values.push(JSON.stringify(updates.llmParsedData));
  }
  if (updates.validationErrors !== undefined) {
    setClauses.push(`validation_errors = $${paramIndex++}`);
    values.push(JSON.stringify(updates.validationErrors));
  }
  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${paramIndex++}`);
    values.push(updates.errorMessage);
  }
  if (updates.parseDurationMs !== undefined) {
    setClauses.push(`parse_duration_ms = $${paramIndex++}`);
    values.push(updates.parseDurationMs);
  }
  if (updates.llmDurationMs !== undefined) {
    setClauses.push(`llm_duration_ms = $${paramIndex++}`);
    values.push(updates.llmDurationMs);
  }
  if (updates.totalDurationMs !== undefined) {
    setClauses.push(`total_duration_ms = $${paramIndex++}`);
    values.push(updates.totalDurationMs);
  }
  if (updates.candidateId !== undefined) {
    setClauses.push(`candidate_id = $${paramIndex++}`);
    values.push(updates.candidateId);
  }
  if (updates.fileId !== undefined) {
    setClauses.push(`file_id = $${paramIndex++}`);
    values.push(updates.fileId);
  }

  if (setClauses.length === 0) return;

  values.push(logId);
  await pool.query(
    `UPDATE extraction_logs SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

/**
 * Persist candidate data to database.
 */
export async function persistCandidate(
  data: CandidateExtraction,
  regexResults: RegexResults,
  extractionLogId: string,
  fileBuffer?: Buffer,
  fileName?: string
): Promise<string> {
  const candidateId = generateCandidateId();
  const email = regexResults.email || `${candidateId}@unknown.com`;

  await pool.query(
    `INSERT INTO candidates (id, name, email, phone, location, linkedin, github, status, summary, years_of_experience, extraction_log_id, extraction_source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      candidateId,
      data.name,
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

  for (const skill of data.skills) {
    const skillId = await getOrCreateSkill(skill.name);
    await pool.query(
      `INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [candidateId, skillId, skill.level]
    );
  }

  for (const language of data.languages) {
    const languageId = await getOrCreateLanguage(language);
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
      [candidateId, exp.title, exp.company, null, toDate(exp.startDate), toDate(exp.endDate), i]
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
      [candidateId, edu.degree, edu.institution, toDate(edu.startDate), toDate(edu.endDate), edu.status || null, i]
    );
  }

  for (let i = 0; i < data.certifications.length; i++) {
    const cert = data.certifications[i];
    await pool.query(
      `INSERT INTO certifications (candidate_id, name, year, sort_order) VALUES ($1, $2, $3, $4)`,
      [candidateId, cert.name, cert.year || null, i]
    );
  }

  if (fileBuffer && fileName) {
    const mimeType = fileName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const fileResult = await pool.query(
      `INSERT INTO files (candidate_id, file_name, file_type, mime_type, content) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [candidateId, fileName, 'cv', mimeType, fileBuffer]
    );
    await updateExtractionLog(extractionLogId, { fileId: fileResult.rows[0].id });
  }

  return candidateId;
}
