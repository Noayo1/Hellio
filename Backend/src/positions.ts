import { Router, Response } from 'express';
import pool from './db.js';
import { authMiddleware, requireAdmin, AuthRequest } from './middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/positions
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id, title, company, location, status, description,
        requirements, skills,
        experience_years as "experienceYears",
        work_type as "workType",
        salary,
        contact_name as "contactName",
        contact_email as "contactEmail"
      FROM positions
      ORDER BY title
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/positions/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        id, title, company, location, status, description,
        requirements, skills,
        experience_years as "experienceYears",
        work_type as "workType",
        salary,
        contact_name as "contactName",
        contact_email as "contactEmail"
      FROM positions
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/positions/:id (admin only)
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title, company, location, status, description,
    requirements, skills, experienceYears, workType,
    salary, contactName, contactEmail
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE positions
      SET
        title = $1,
        company = $2,
        location = $3,
        status = $4,
        description = $5,
        requirements = $6,
        skills = $7,
        experience_years = $8,
        work_type = $9,
        salary = $10,
        contact_name = $11,
        contact_email = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING
        id, title, company, location, status, description,
        requirements, skills,
        experience_years as "experienceYears",
        work_type as "workType",
        salary,
        contact_name as "contactName",
        contact_email as "contactEmail"
    `, [
      title, company, location, status, description,
      JSON.stringify(requirements), JSON.stringify(skills),
      experienceYears, workType, salary, contactName, contactEmail, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
