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
    promptVersion?: string;
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
  if (updates.promptVersion !== undefined) {
    setClauses.push(`prompt_version = $${paramIndex++}`);
    values.push(updates.promptVersion);
  }

  if (setClauses.length === 0) return;

  values.push(logId);
  await pool.query(
    `UPDATE extraction_logs SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
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
  // Insert skills
  for (const skill of data.skills) {
    const skillId = await getOrCreateSkill(skill.name);
    await pool.query(
      `INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [candidateId, skillId, skill.level]
    );
  }

  // Insert languages
  for (const language of data.languages) {
    const languageId = await getOrCreateLanguage(language);
    await pool.query(
      `INSERT INTO candidate_languages (candidate_id, language_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [candidateId, languageId]
    );
  }

  // Insert experiences with highlights
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

  // Insert education
  for (let i = 0; i < data.education.length; i++) {
    const edu = data.education[i];
    await pool.query(
      `INSERT INTO education (candidate_id, degree, institution, start_date, end_date, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [candidateId, edu.degree, edu.institution, toDate(edu.startDate), toDate(edu.endDate), edu.status || null, i]
    );
  }

  // Insert certifications
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
    candidateId = generateCandidateId();

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
 * Generate a unique position ID.
 */
function generatePositionId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Persist job data to database.
 */
export async function persistJob(
  data: JobExtraction,
  regexResults: RegexResults,
  extractionLogId: string
): Promise<string> {
  const positionId = generatePositionId();

  // Use regex results with LLM fallback for contact info and title
  const contactEmail = regexResults.contactEmail || data.contactEmail || 'hr@company.com';
  const contactName = regexResults.contactName || data.contactName || 'HR Department';
  const title = regexResults.jobTitle || data.title;

  await pool.query(
    `INSERT INTO positions (id, title, company, location, status, description, experience_years, work_type, salary, contact_name, contact_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
      contactName,
      contactEmail,
    ]
  );

  // Insert skills
  for (const skillName of data.skills) {
    const skillId = await getOrCreateSkill(skillName);
    await pool.query(
      `INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [positionId, skillId]
    );
  }

  // Insert requirements
  for (let i = 0; i < data.requirements.length; i++) {
    const req = data.requirements[i];
    await pool.query(
      `INSERT INTO position_requirements (position_id, text, required, sort_order) VALUES ($1, $2, $3, $4)`,
      [positionId, req.text, req.required, i]
    );
  }

  return positionId;
}
