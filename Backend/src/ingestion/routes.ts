/**
 * API routes for document ingestion.
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware.js';
import { processDocument } from './pipeline.js';
import pool from '../db.js';

const router = Router();

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

      if (result.success) {
        res.json({
          success: true,
          candidateId: result.candidateId,
          positionId: result.positionId,
          extractionLogId: result.extractionLogId,
          warnings: result.warnings,
        });
      } else {
        res.status(422).json({
          success: false,
          errors: result.errors,
          extractionLogId: result.extractionLogId,
        });
      }
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

  try {
    let query = `
      SELECT id, source_file_path, source_type, status, error_message,
             parse_duration_ms, llm_duration_ms, total_duration_ms, created_at,
             candidate_id
      FROM extraction_logs
    `;
    const values: unknown[] = [];

    if (status) {
      query += ` WHERE status = $1`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    let countQuery = `SELECT COUNT(*) FROM extraction_logs`;
    const countValues: unknown[] = [];
    if (status) {
      countQuery += ` WHERE status = $1`;
      countValues.push(status);
    }
    const countResult = await pool.query(countQuery, countValues);

    res.json({
      logs: result.rows,
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

    // Parse JSON fields stored as TEXT
    if (log.regex_results) {
      try { log.regex_results = JSON.parse(log.regex_results); } catch { /* keep as string */ }
    }
    if (log.llm_parsed_data) {
      try { log.llm_parsed_data = JSON.parse(log.llm_parsed_data); } catch { /* keep as string */ }
    }
    if (log.validation_errors) {
      try { log.validation_errors = JSON.parse(log.validation_errors); } catch { /* keep as string */ }
    }

    res.json(log);
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
