import { Router, Response } from 'express';
import pool from './db.js';
import { authMiddleware, AuthRequest } from './middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/files/:fileId - Download file
router.get('/:fileId', async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;

  try {
    const result = await pool.query(`
      SELECT file_name, mime_type, content
      FROM files
      WHERE id = $1
    `, [fileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.send(file.content);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
