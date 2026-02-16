/**
 * API routes for semantic search suggestions.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware.js';
import pool from '../db.js';
import { findSimilarCandidates, findSimilarPositions } from './search.js';
import { invokeNova, BedrockResponse } from '../ingestion/extractors/bedrock.js';

/**
 * Log LLM usage to the database for cost tracking.
 */
async function logLlmUsage(
  purpose: string,
  entityType: string,
  entityId: string,
  response: BedrockResponse
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO llm_logs (purpose, entity_type, entity_id, model_id, input_tokens, output_tokens, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [purpose, entityType, entityId, response.modelId, response.inputTokens, response.outputTokens, response.durationMs]
    );
  } catch (error) {
    console.error('Failed to log LLM usage:', error);
  }
}

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/positions/:id/suggest-candidates
 * Returns top 3 similar candidates for a position.
 * Excludes candidates already assigned to this position.
 */
router.get(
  '/positions/:id/suggest-candidates',
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 3, 10);

    try {
      const suggestions = await findSimilarCandidates(id, limit);
      res.json({ suggestions });
    } catch (error) {
      console.error('Error finding similar candidates:', error);
      res.status(500).json({ error: 'Failed to find suggestions' });
    }
  }
);

/**
 * Get or generate explanation for a candidate-position pair.
 * Uses cache to avoid regenerating explanations.
 */
async function getOrCreateExplanation(
  candidateId: string,
  positionId: string,
  candidateText: string,
  similarity: number
): Promise<string | null> {
  // Check cache first
  const cached = await pool.query(
    'SELECT explanation FROM explanation_cache WHERE candidate_id = $1 AND position_id = $2',
    [candidateId, positionId]
  );

  if (cached.rows.length > 0) {
    return cached.rows[0].explanation;
  }

  // Fetch position text
  const positionQuery = await pool.query(
    'SELECT embedding_text FROM positions WHERE id = $1',
    [positionId]
  );
  const positionText = positionQuery.rows[0]?.embedding_text || '';

  const prompt = `Given this candidate profile:
${candidateText}

And this job position:
${positionText}

In 1-2 sentences, explain why this position might be a good fit for this candidate. Focus on specific skill matches and experience alignment. Be concise and specific.`;

  try {
    const response = await invokeNova(prompt);
    const explanation = response.text.trim();

    // Log LLM usage for cost tracking
    await logLlmUsage('explanation', 'position', positionId, response);

    // Store in cache
    await pool.query(
      `INSERT INTO explanation_cache (candidate_id, position_id, explanation, similarity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (candidate_id, position_id) DO UPDATE SET explanation = $3, similarity = $4`,
      [candidateId, positionId, explanation, similarity]
    );

    return explanation;
  } catch {
    return null;
  }
}

/**
 * GET /api/candidates/:id/suggest-positions
 * Returns up to 3 relevant positions for a candidate.
 * Includes LLM-generated explanations when explain=true (cached for consistency).
 * Only returns positions with similarity >= 60% and matching experience level.
 */
router.get(
  '/candidates/:id/suggest-positions',
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 3, 10);
    const includeExplanation = req.query.explain === 'true';

    try {
      // Experience filtering is enabled by default
      const suggestions = await findSimilarPositions(id, limit, 0.5, true);

      // If no relevant positions found
      if (suggestions.length === 0) {
        return res.json({
          suggestions: [],
          message: 'No sufficiently relevant positions found for this candidate.',
        });
      }

      // Get or generate explanations if requested
      if (includeExplanation && suggestions.length > 0) {
        // Fetch candidate embedding text for context
        const candidateQuery = await pool.query(
          'SELECT name, embedding_text FROM candidates WHERE id = $1',
          [id]
        );

        if (candidateQuery.rows.length > 0) {
          const candidate = candidateQuery.rows[0];

          // Get explanations in parallel (uses cache when available)
          const explanationPromises = suggestions.map((pos) =>
            getOrCreateExplanation(id, pos.id, candidate.embedding_text, pos.similarity)
          );

          const explanations = await Promise.all(explanationPromises);
          suggestions.forEach((pos, idx) => {
            if (explanations[idx]) {
              pos.explanation = explanations[idx] as string;
            }
          });
        }
      }

      res.json({ suggestions });
    } catch (error) {
      console.error('Error finding similar positions:', error);
      res.status(500).json({ error: 'Failed to find suggestions' });
    }
  }
);

/**
 * GET /api/stats/embedding-costs
 * Returns embedding usage statistics and estimated costs.
 */
router.get('/stats/embedding-costs', async (_req: AuthRequest, res: Response) => {
  try {
    // Get embedding statistics from logs
    const logsQuery = await pool.query(`
      SELECT
        entity_type,
        COUNT(*) as count,
        SUM(LENGTH(embedding_text)) as total_chars,
        AVG(duration_ms) as avg_duration_ms
      FROM embedding_logs
      GROUP BY entity_type
    `);

    // Get counts of entities with embeddings
    const candidatesWithEmbeddings = await pool.query(
      'SELECT COUNT(*) FROM candidates WHERE embedding IS NOT NULL'
    );
    const positionsWithEmbeddings = await pool.query(
      'SELECT COUNT(*) FROM positions WHERE embedding IS NOT NULL'
    );

    // Get LLM usage statistics from logs
    const llmLogsQuery = await pool.query(`
      SELECT
        COUNT(*) as total_calls,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens
      FROM llm_logs
      WHERE purpose = 'explanation'
    `);

    // Calculate embedding costs
    // AWS Titan: ~$0.00002 per 1,000 input tokens
    // Approximate: 4 characters per token
    const EMBEDDING_COST_PER_1K_TOKENS = 0.00002;
    const CHARS_PER_TOKEN = 4;

    // Nova Lite pricing (per 1K tokens)
    const LLM_INPUT_COST_PER_1K = 0.00006;  // $0.06 per 1M input tokens
    const LLM_OUTPUT_COST_PER_1K = 0.00024; // $0.24 per 1M output tokens

    let totalCandidateChars = 0;
    let totalPositionChars = 0;
    let candidateCount = 0;
    let positionCount = 0;

    for (const row of logsQuery.rows) {
      if (row.entity_type === 'candidate') {
        totalCandidateChars = parseInt(row.total_chars) || 0;
        candidateCount = parseInt(row.count) || 0;
      } else if (row.entity_type === 'position') {
        totalPositionChars = parseInt(row.total_chars) || 0;
        positionCount = parseInt(row.count) || 0;
      }
    }

    const totalChars = totalCandidateChars + totalPositionChars;
    const estimatedEmbeddingTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
    const embeddingCost = (estimatedEmbeddingTokens / 1000) * EMBEDDING_COST_PER_1K_TOKENS;

    // Calculate actual LLM costs from logs
    const llmStats = llmLogsQuery.rows[0];
    const llmCalls = parseInt(llmStats?.total_calls) || 0;
    const llmInputTokens = parseInt(llmStats?.total_input_tokens) || 0;
    const llmOutputTokens = parseInt(llmStats?.total_output_tokens) || 0;
    const llmTotalTokens = llmInputTokens + llmOutputTokens;
    const llmCost = (llmInputTokens / 1000) * LLM_INPUT_COST_PER_1K +
                    (llmOutputTokens / 1000) * LLM_OUTPUT_COST_PER_1K;

    res.json({
      embeddings: {
        candidates: parseInt(candidatesWithEmbeddings.rows[0].count),
        positions: parseInt(positionsWithEmbeddings.rows[0].count),
        totalGenerated: candidateCount + positionCount,
      },
      usage: {
        totalCharacters: totalChars,
        estimatedTokens: estimatedEmbeddingTokens,
        avgCandidateChars: candidateCount > 0 ? Math.round(totalCandidateChars / candidateCount) : 0,
        avgPositionChars: positionCount > 0 ? Math.round(totalPositionChars / positionCount) : 0,
      },
      llmUsage: {
        totalCalls: llmCalls,
        inputTokens: llmInputTokens,
        outputTokens: llmOutputTokens,
        totalTokens: llmTotalTokens,
      },
      costs: {
        embeddingCost: parseFloat(embeddingCost.toFixed(6)),
        embeddingCostFormatted: `$${embeddingCost.toFixed(6)}`,
        perCandidateAvg: candidateCount > 0
          ? parseFloat(((totalCandidateChars / CHARS_PER_TOKEN / 1000 * EMBEDDING_COST_PER_1K_TOKENS) / candidateCount).toFixed(8))
          : 0,
        perPositionAvg: positionCount > 0
          ? parseFloat(((totalPositionChars / CHARS_PER_TOKEN / 1000 * EMBEDDING_COST_PER_1K_TOKENS) / positionCount).toFixed(8))
          : 0,
        llmCost: parseFloat(llmCost.toFixed(6)),
        llmCostFormatted: `$${llmCost.toFixed(6)}`,
      },
      pricing: {
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        embeddingPricePerKTokens: EMBEDDING_COST_PER_1K_TOKENS,
        llmModel: 'amazon.nova-lite-v1:0',
        llmInputPricePerKTokens: LLM_INPUT_COST_PER_1K,
        llmOutputPricePerKTokens: LLM_OUTPUT_COST_PER_1K,
      },
    });
  } catch (error) {
    console.error('Error fetching embedding costs:', error);
    res.status(500).json({ error: 'Failed to fetch costs' });
  }
});

export default router;
