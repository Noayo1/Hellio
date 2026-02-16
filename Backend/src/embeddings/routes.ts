/**
 * API routes for semantic search suggestions.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware.js';
import pool from '../db.js';
import { findSimilarCandidates, findSimilarPositions } from './search.js';
import { invokeNova } from '../ingestion/extractors/bedrock.js';

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
 * GET /api/candidates/:id/suggest-positions
 * Returns up to 3 relevant positions for a candidate.
 * Includes LLM-generated explanations when explain=true.
 * Only returns positions with similarity >= 60%.
 */
router.get(
  '/candidates/:id/suggest-positions',
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 3, 10);
    const includeExplanation = req.query.explain === 'true';

    try {
      const suggestions = await findSimilarPositions(id, limit, 0.6);

      // If no relevant positions found
      if (suggestions.length === 0) {
        return res.json({
          suggestions: [],
          message: 'No sufficiently relevant positions found for this candidate.',
        });
      }

      // Generate LLM explanations if requested
      if (includeExplanation && suggestions.length > 0) {
        // Fetch candidate embedding text for context
        const candidateQuery = await pool.query(
          'SELECT name, embedding_text FROM candidates WHERE id = $1',
          [id]
        );

        if (candidateQuery.rows.length > 0) {
          const candidate = candidateQuery.rows[0];

          // Generate explanations in parallel
          const explanationPromises = suggestions.map(async (pos) => {
            const positionQuery = await pool.query(
              'SELECT embedding_text FROM positions WHERE id = $1',
              [pos.id]
            );
            const positionText = positionQuery.rows[0]?.embedding_text || '';

            const prompt = `Given this candidate profile:
${candidate.embedding_text}

And this job position:
${positionText}

In 1-2 sentences, explain why this position might be a good fit for this candidate. Focus on specific skill matches and experience alignment. Be concise and specific.`;

            try {
              const response = await invokeNova(prompt);
              return response.text.trim();
            } catch {
              return null;
            }
          });

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

export default router;
