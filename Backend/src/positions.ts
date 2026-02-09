import { Router, Response } from 'express';
import pool from './db.js';
import { authMiddleware, requireAdmin, AuthRequest } from './middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper to get or create a skill
async function getOrCreateSkill(skillName: string): Promise<number> {
  const result = await pool.query(
    `INSERT INTO skills (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [skillName]
  );
  return result.rows[0].id;
}

// Helper function to get full position data from normalized tables
async function getPositionById(positionId: string) {
  // Get base position
  const positionResult = await pool.query(
    `SELECT id, title, company, location, status, description,
            experience_years as "experienceYears",
            work_type as "workType",
            salary,
            contact_name as "contactName",
            contact_email as "contactEmail"
     FROM positions WHERE id = $1`,
    [positionId]
  );

  if (positionResult.rows.length === 0) {
    return null;
  }

  const position = positionResult.rows[0];

  // Get skills
  const skillsResult = await pool.query(
    `SELECT s.name
     FROM position_skills ps
     JOIN skills s ON ps.skill_id = s.id
     WHERE ps.position_id = $1`,
    [positionId]
  );
  position.skills = skillsResult.rows.map((r) => r.name);

  // Get requirements
  const requirementsResult = await pool.query(
    `SELECT text, required
     FROM position_requirements
     WHERE position_id = $1
     ORDER BY sort_order`,
    [positionId]
  );
  position.requirements = requirementsResult.rows;

  return position;
}

// Helper function to get all positions
async function getAllPositions() {
  const idsResult = await pool.query(`SELECT id FROM positions ORDER BY title`);
  const positions = [];

  for (const row of idsResult.rows) {
    const position = await getPositionById(row.id);
    if (position) {
      positions.push(position);
    }
  }

  return positions;
}

// GET /api/positions
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const positions = await getAllPositions();
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/positions/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const position = await getPositionById(id);

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(position);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/positions/:id (admin only)
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    company,
    location,
    status,
    description,
    requirements,
    skills,
    experienceYears,
    workType,
    salary,
    contactName,
    contactEmail,
  } = req.body;

  try {
    // Check if position exists
    const existingPosition = await pool.query('SELECT id FROM positions WHERE id = $1', [id]);
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Update base position
    await pool.query(
      `UPDATE positions
       SET title = $1, company = $2, location = $3, status = $4, description = $5,
           experience_years = $6, work_type = $7, salary = $8,
           contact_name = $9, contact_email = $10, updated_at = NOW()
       WHERE id = $11`,
      [title, company, location, status, description, experienceYears, workType, salary, contactName, contactEmail, id]
    );

    // Update skills: delete existing, insert new
    await pool.query('DELETE FROM position_skills WHERE position_id = $1', [id]);
    for (const skillName of skills) {
      const skillId = await getOrCreateSkill(skillName);
      await pool.query(
        `INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, skillId]
      );
    }

    // Update requirements: delete existing, insert new
    await pool.query('DELETE FROM position_requirements WHERE position_id = $1', [id]);
    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      await pool.query(
        `INSERT INTO position_requirements (position_id, text, required, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [id, req.text, req.required, i]
      );
    }

    // Return updated position
    const updatedPosition = await getPositionById(id);
    res.json(updatedPosition);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
