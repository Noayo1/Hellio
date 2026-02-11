import { Router, Response } from 'express';
import pool from './db.js';
import { authMiddleware, requireAdmin, AuthRequest } from './middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper function to get full candidate data from normalized tables
async function getCandidateById(candidateId: string) {
  // Get base candidate
  const candidateResult = await pool.query(
    `SELECT id, name, email, phone, location,
            linkedin as "linkedIn", github, status, summary,
            years_of_experience as "yearsOfExperience"
     FROM candidates WHERE id = $1`,
    [candidateId]
  );

  if (candidateResult.rows.length === 0) {
    return null;
  }

  const candidate = candidateResult.rows[0];

  // Get skills with levels
  const skillsResult = await pool.query(
    `SELECT s.name, cs.level
     FROM candidate_skills cs
     JOIN skills s ON cs.skill_id = s.id
     WHERE cs.candidate_id = $1`,
    [candidateId]
  );
  candidate.skills = skillsResult.rows;

  // Get languages
  const languagesResult = await pool.query(
    `SELECT l.name
     FROM candidate_languages cl
     JOIN languages l ON cl.language_id = l.id
     WHERE cl.candidate_id = $1`,
    [candidateId]
  );
  candidate.languages = languagesResult.rows.map((r) => r.name);

  // Get experiences with highlights
  const experiencesResult = await pool.query(
    `SELECT id, title, company, location,
            TO_CHAR(start_date, 'YYYY-MM') as "startDate",
            TO_CHAR(end_date, 'YYYY-MM') as "endDate"
     FROM experiences
     WHERE candidate_id = $1
     ORDER BY sort_order`,
    [candidateId]
  );

  // Get highlights for each experience
  const experiences = [];
  for (const exp of experiencesResult.rows) {
    const highlightsResult = await pool.query(
      `SELECT highlight FROM experience_highlights
       WHERE experience_id = $1
       ORDER BY sort_order`,
      [exp.id]
    );
    experiences.push({
      title: exp.title,
      company: exp.company,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      highlights: highlightsResult.rows.map((r) => r.highlight),
    });
  }
  candidate.experience = experiences;

  // Get education
  const educationResult = await pool.query(
    `SELECT degree, institution,
            TO_CHAR(start_date, 'YYYY-MM') as "startDate",
            TO_CHAR(end_date, 'YYYY-MM') as "endDate",
            status
     FROM education
     WHERE candidate_id = $1
     ORDER BY sort_order`,
    [candidateId]
  );
  candidate.education = educationResult.rows;

  // Get certifications
  const certificationsResult = await pool.query(
    `SELECT name, year
     FROM certifications
     WHERE candidate_id = $1
     ORDER BY sort_order`,
    [candidateId]
  );
  candidate.certifications = certificationsResult.rows;

  // Get position IDs
  const positionsResult = await pool.query(
    `SELECT position_id FROM candidate_positions WHERE candidate_id = $1`,
    [candidateId]
  );
  candidate.positionIds = positionsResult.rows.map((r) => r.position_id);

  return candidate;
}

// Helper function to get all candidates
async function getAllCandidates() {
  // Get all candidate IDs
  const idsResult = await pool.query(`SELECT id FROM candidates ORDER BY name`);
  const candidates = [];

  for (const row of idsResult.rows) {
    const candidate = await getCandidateById(row.id);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

// GET /api/candidates
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const candidates = await getAllCandidates();
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const candidate = await getCandidateById(id);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/candidates/:id/positions/:positionId (admin only)
router.post('/:id/positions/:positionId', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id, positionId } = req.params;

  try {
    // Check if candidate exists
    const candidate = await getCandidateById(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Insert assignment (ON CONFLICT DO NOTHING to prevent duplicates)
    await pool.query(
      `INSERT INTO candidate_positions (candidate_id, position_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, positionId]
    );

    // Return updated candidate
    const updatedCandidate = await getCandidateById(id);
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
    const candidate = await getCandidateById(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Delete assignment
    await pool.query(
      `DELETE FROM candidate_positions
       WHERE candidate_id = $1 AND position_id = $2`,
      [id, positionId]
    );

    // Return updated candidate
    const updatedCandidate = await getCandidateById(id);
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
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE id = $1', [id]);
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get files (without content) - include version info
    const result = await pool.query(
      `SELECT
        id,
        file_name as "fileName",
        file_type as "fileType",
        mime_type as "mimeType",
        created_at as "createdAt",
        COALESCE(version_number, 1) as "versionNumber",
        COALESCE(is_current, true) as "isCurrent"
      FROM files
      WHERE candidate_id = $1
      ORDER BY version_number DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/candidates/:id - Delete candidate (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM candidates WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
