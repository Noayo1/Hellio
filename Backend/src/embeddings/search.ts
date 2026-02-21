/**
 * Semantic similarity search using pgvector.
 */

import pool from '../db.js';
import { generateEmbedding, EMBEDDING_DIMENSION } from './bedrock-embeddings.js';
import {
  buildCandidateEmbeddingText,
  buildPositionEmbeddingText,
} from './embedding-text.js';

export interface SimilarCandidate {
  id: string;
  name: string;
  email: string;
  similarity: number;
}

export interface SimilarPosition {
  id: string;
  title: string;
  company: string;
  similarity: number;
  explanation?: string;
}

/** Database row types for type safety */
interface CandidateEmbeddingRow {
  embedding: string;
  years_of_experience: string | number | null;
}

interface PositionSimilarityRow {
  id: string;
  title: string;
  company: string;
  experience_years: number | null;
  similarity: string | number;
}

interface CandidateSimilarityRow {
  id: string;
  name: string;
  email: string;
  similarity: string | number;
}

/**
 * Safely parse a database value to number.
 * Handles string, number, null, and undefined.
 */
function toNumber(value: string | number | null | undefined, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Find top N candidates similar to a position.
 * Excludes already-assigned candidates.
 */
export async function findSimilarCandidates(
  positionId: string,
  limit: number = 3,
  minSimilarity: number = 0.5
): Promise<SimilarCandidate[]> {
  // Get position embedding
  const positionResult = await pool.query(
    'SELECT embedding FROM positions WHERE id = $1 AND embedding IS NOT NULL',
    [positionId]
  );

  if (positionResult.rows.length === 0 || !positionResult.rows[0].embedding) {
    return [];
  }

  const embedding = positionResult.rows[0].embedding;

  // Find similar candidates, excluding already assigned
  const result = await pool.query<CandidateSimilarityRow>(
    `SELECT
      c.id,
      c.name,
      c.email,
      1 - (c.embedding <=> $1::vector) as similarity
    FROM candidates c
    WHERE c.embedding IS NOT NULL
      AND c.status = 'active'
      AND c.id NOT IN (
        SELECT candidate_id FROM candidate_positions WHERE position_id = $2
      )
      AND 1 - (c.embedding <=> $1::vector) >= $3
    ORDER BY c.embedding <=> $1::vector
    LIMIT $4`,
    [embedding, positionId, minSimilarity, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    similarity: parseFloat(toNumber(row.similarity).toFixed(3)),
  }));
}

/**
 * Find top N positions similar to a candidate.
 * Only returns open positions with reasonable similarity.
 * Experience matching: allows 1 year flexibility but penalizes under-qualified matches.
 */
export async function findSimilarPositions(
  candidateId: string,
  limit: number = 3,
  minSimilarity: number = 0.5,
  filterByExperience: boolean = true
): Promise<SimilarPosition[]> {
  const TOLERANCE = 2; // Allow positions requiring up to 2 years more than candidate has
  const PENALTY_PER_YEAR = 0.05; // 5% penalty per year short

  const candidateResult = await pool.query<CandidateEmbeddingRow>(
    'SELECT embedding, years_of_experience FROM candidates WHERE id = $1 AND embedding IS NOT NULL',
    [candidateId]
  );

  if (!candidateResult.rows.length || !candidateResult.rows[0].embedding) {
    return [];
  }

  const { embedding, years_of_experience } = candidateResult.rows[0];
  const candidateYears = toNumber(years_of_experience);
  const maxAllowed = Math.floor(candidateYears + TOLERANCE); // Floor to match integer column

  const experienceCondition = filterByExperience
    ? 'AND (p.experience_years IS NULL OR p.experience_years <= $4)'
    : '';

  const queryParams = filterByExperience
    ? [embedding, minSimilarity, limit * 2, maxAllowed]
    : [embedding, minSimilarity, limit];

  const result = await pool.query<PositionSimilarityRow>(
    `SELECT p.id, p.title, p.company, p.experience_years,
            1 - (p.embedding <=> $1::vector) as similarity
     FROM positions p
     WHERE p.embedding IS NOT NULL
       AND p.status = 'open'
       AND 1 - (p.embedding <=> $1::vector) >= $2
       ${experienceCondition}
     ORDER BY p.embedding <=> $1::vector
     LIMIT $3`,
    queryParams
  );

  // Apply penalty for under-qualified matches and re-rank
  return result.rows
    .map((row) => {
      const base = toNumber(row.similarity);
      const gap = Math.max(0, toNumber(row.experience_years) - candidateYears);
      const adjusted = base - gap * PENALTY_PER_YEAR;
      return {
        id: row.id,
        title: row.title,
        company: row.company,
        similarity: parseFloat(Math.max(0, adjusted).toFixed(3)),
      };
    })
    .filter((r) => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

async function storeEmbeddingAndLog(
  entityType: 'candidate' | 'position',
  entityId: string,
  embeddingText: string,
  result: import('./bedrock-embeddings.js').EmbeddingResult
): Promise<void> {
  const table = entityType === 'candidate' ? 'candidates' : 'positions';
  const cacheColumn = entityType === 'candidate' ? 'candidate_id' : 'position_id';

  await pool.query(
    `UPDATE ${table}
     SET embedding = $1::vector,
         embedding_text = $2,
         embedding_created_at = NOW()
     WHERE id = $3`,
    [`[${result.embedding.join(',')}]`, embeddingText, entityId]
  );

  await pool.query(
    `DELETE FROM explanation_cache WHERE ${cacheColumn} = $1`,
    [entityId]
  );

  const estimatedTokens = Math.ceil(embeddingText.length / 4);
  await pool.query(
    `INSERT INTO embedding_logs (entity_type, entity_id, embedding_text, embedding_model, dimension, duration_ms, input_tokens)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entityType,
      entityId,
      embeddingText,
      'amazon.titan-embed-text-v2:0',
      EMBEDDING_DIMENSION,
      result.durationMs,
      estimatedTokens,
    ]
  );
}

/**
 * Generate and store embedding for a candidate.
 */
export async function updateCandidateEmbedding(
  candidateId: string
): Promise<boolean> {
  const candidateResult = await pool.query(
    `SELECT id, name, summary, location, years_of_experience as "yearsOfExperience"
     FROM candidates WHERE id = $1`,
    [candidateId]
  );

  if (candidateResult.rows.length === 0) return false;
  const candidate = candidateResult.rows[0];

  const skillsResult = await pool.query(
    `SELECT s.name, cs.level
     FROM candidate_skills cs
     JOIN skills s ON cs.skill_id = s.id
     WHERE cs.candidate_id = $1`,
    [candidateId]
  );
  candidate.skills = skillsResult.rows;

  const languagesResult = await pool.query(
    `SELECT l.name FROM candidate_languages cl
     JOIN languages l ON cl.language_id = l.id
     WHERE cl.candidate_id = $1`,
    [candidateId]
  );
  candidate.languages = languagesResult.rows.map((r) => r.name);

  const experiencesResult = await pool.query(
    `SELECT e.id, e.title, e.company
     FROM experiences e
     WHERE e.candidate_id = $1
     ORDER BY e.sort_order`,
    [candidateId]
  );

  candidate.experience = [];
  for (const exp of experiencesResult.rows) {
    const highlightsResult = await pool.query(
      `SELECT highlight FROM experience_highlights
       WHERE experience_id = $1 ORDER BY sort_order`,
      [exp.id]
    );
    candidate.experience.push({
      title: exp.title,
      company: exp.company,
      highlights: highlightsResult.rows.map((r) => r.highlight),
    });
  }

  const educationResult = await pool.query(
    `SELECT degree, institution FROM education WHERE candidate_id = $1`,
    [candidateId]
  );
  candidate.education = educationResult.rows;

  const certsResult = await pool.query(
    `SELECT name FROM certifications WHERE candidate_id = $1`,
    [candidateId]
  );
  candidate.certifications = certsResult.rows;

  const embeddingText = buildCandidateEmbeddingText(candidate);

  const result = await generateEmbedding(embeddingText);
  if (result.error) {
    console.error(
      `Failed to generate embedding for candidate ${candidateId}:`,
      result.error
    );
    return false;
  }

  await storeEmbeddingAndLog('candidate', candidateId, embeddingText, result);
  return true;
}

/**
 * Generate and store embedding for a position.
 */
export async function updatePositionEmbedding(
  positionId: string
): Promise<boolean> {
  const positionResult = await pool.query(
    `SELECT id, title, company, description, location,
            experience_years as "experienceYears", work_type as "workType"
     FROM positions WHERE id = $1`,
    [positionId]
  );

  if (positionResult.rows.length === 0) return false;
  const position = positionResult.rows[0];

  const skillsResult = await pool.query(
    `SELECT s.name FROM position_skills ps
     JOIN skills s ON ps.skill_id = s.id
     WHERE ps.position_id = $1`,
    [positionId]
  );
  position.skills = skillsResult.rows.map((r) => r.name);

  const requirementsResult = await pool.query(
    `SELECT text, required FROM position_requirements
     WHERE position_id = $1 ORDER BY sort_order`,
    [positionId]
  );
  position.requirements = requirementsResult.rows;

  const embeddingText = buildPositionEmbeddingText(position);

  const result = await generateEmbedding(embeddingText);
  if (result.error) {
    console.error(
      `Failed to generate embedding for position ${positionId}:`,
      result.error
    );
    return false;
  }

  await storeEmbeddingAndLog('position', positionId, embeddingText, result);
  return true;
}
