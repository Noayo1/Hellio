/**
 * API routes for document ingestion.
 */

import { Router, Response } from 'express';
import multer from 'multer';

import pool from '../db.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware.js';
import { processDocument } from './pipeline.js';

const router = Router();

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware);

/**
 * POST /api/ingestion/upload
 */
router.post(
  '/upload',
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    const file = req.file;
    const type = req.query.type as 'cv' | 'job';
    const dryRun = req.query.dryRun === 'true';

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    if (!type || (type !== 'cv' && type !== 'job')) {
      res.status(400).json({ error: 'Query param "type" must be "cv" or "job"' });
      return;
    }

    try {
      const result = await processDocument({
        buffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        type,
        dryRun,
      });

      const status = result.success ? 200 : 422;
      res.status(status).json(result);
    } catch (error) {
      console.error('Ingestion upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/ingestion/logs
 */
router.get('/logs', async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const whereClause = status ? 'WHERE status = $1' : '';
  const filterValues = status ? [status] : [];

  try {
    const logsQuery = `
      SELECT id, source_file_path, source_type, status, error_message,
             parse_duration_ms, llm_duration_ms, total_duration_ms, created_at,
             candidate_id
      FROM extraction_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}
    `;
    const countQuery = `SELECT COUNT(*) FROM extraction_logs ${whereClause}`;

    const [logsResult, countResult] = await Promise.all([
      pool.query(logsQuery, [...filterValues, limit, offset]),
      pool.query(countQuery, filterValues),
    ]);

    res.json({
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ingestion/logs/:id
 */
router.get('/logs/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM extraction_logs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Log not found' });
      return;
    }

    const log = result.rows[0];
    log.regex_results = tryParseJson(log.regex_results);
    log.llm_parsed_data = tryParseJson(log.llm_parsed_data);
    log.validation_errors = tryParseJson(log.validation_errors);

    res.json(log);
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
