import { Router, Response } from 'express';
import pool from './db.js';
import { authMiddleware, requireAdmin, AuthRequest } from './middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/candidates
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.email, c.phone, c.location,
        c.linkedin, c.github, c.status, c.summary,
        c.skills, c.languages, c.experience, c.education, c.certifications,
        COALESCE(
          (SELECT json_agg(cp.position_id) FROM candidate_positions cp WHERE cp.candidate_id = c.id),
          '[]'::json
        ) as "positionIds"
      FROM candidates c
      ORDER BY c.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.email, c.phone, c.location,
        c.linkedin, c.github, c.status, c.summary,
        c.skills, c.languages, c.experience, c.education, c.certifications,
        COALESCE(
          (SELECT json_agg(cp.position_id) FROM candidate_positions cp WHERE cp.candidate_id = c.id),
          '[]'::json
        ) as "positionIds"
      FROM candidates c
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get candidate with positionIds
async function getCandidateWithPositions(candidateId: string) {
  const result = await pool.query(`
    SELECT
      c.id, c.name, c.email, c.phone, c.location,
      c.linkedin, c.github, c.status, c.summary,
      c.skills, c.languages, c.experience, c.education, c.certifications,
      COALESCE(
        (SELECT json_agg(cp.position_id) FROM candidate_positions cp WHERE cp.candidate_id = c.id),
        '[]'::json
      ) as "positionIds"
    FROM candidates c
    WHERE c.id = $1
  `, [candidateId]);

  return result.rows[0] || null;
}

// POST /api/candidates/:id/positions/:positionId (admin only)
router.post('/:id/positions/:positionId', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id, positionId } = req.params;

  try {
    // Check if candidate exists
    const candidate = await getCandidateWithPositions(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Insert assignment (ON CONFLICT DO NOTHING to prevent duplicates)
    await pool.query(`
      INSERT INTO candidate_positions (candidate_id, position_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [id, positionId]);

    // Return updated candidate
    const updatedCandidate = await getCandidateWithPositions(id);
    res.json(updatedCandidate);
  } catch (error) {
    console.error('Error assigning position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/candidates/:id/positions/:positionId (admin only)
router.delete('/:id/positions/:positionId', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id, positionId } = req.params;

  try {
    // Check if candidate exists
    const candidate = await getCandidateWithPositions(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Delete assignment
    await pool.query(`
      DELETE FROM candidate_positions
      WHERE candidate_id = $1 AND position_id = $2
    `, [id, positionId]);

    // Return updated candidate
    const updatedCandidate = await getCandidateWithPositions(id);
    res.json(updatedCandidate);
  } catch (error) {
    console.error('Error unassigning position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/:id/files - List files for candidate
router.get('/:id/files', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Check if candidate exists
    const candidateResult = await pool.query(
      'SELECT id FROM candidates WHERE id = $1',
      [id]
    );
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get files (without content)
    const result = await pool.query(`
      SELECT
        id,
        file_name as "fileName",
        file_type as "fileType",
        mime_type as "mimeType",
        created_at as "createdAt"
      FROM files
      WHERE candidate_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
