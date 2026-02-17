import { Router, Response } from 'express';
import pool from './db.js';
import { authMiddleware, AuthRequest } from './middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Valid notification statuses
const VALID_STATUSES = ['pending', 'reviewed', 'dismissed'];

// ============ PROCESSED EMAILS ============

// POST /api/agent/processed-emails - Mark email as processed
router.post('/processed-emails', async (req: AuthRequest, res: Response) => {
  const { emailId, emailType, actionTaken, draftId, candidateId, positionId, summary } = req.body;

  if (!emailId || !emailType) {
    return res.status(400).json({ error: 'emailId and emailType are required' });
  }

  try {
    // Check if already exists (idempotent)
    const existing = await pool.query(
      'SELECT * FROM agent_processed_emails WHERE email_id = $1',
      [emailId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json(formatProcessedEmail(existing.rows[0]));
    }

    // Insert new record
    const result = await pool.query(
      `INSERT INTO agent_processed_emails
       (email_id, email_type, action_taken, draft_id, candidate_id, position_id, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [emailId, emailType, actionTaken, draftId, candidateId, positionId, summary]
    );

    res.status(201).json(formatProcessedEmail(result.rows[0]));
  } catch (error) {
    console.error('Error creating processed email record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agent/processed-emails - List all processed emails
router.get('/processed-emails', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agent_processed_emails ORDER BY processed_at DESC'
    );
    res.json(result.rows.map(formatProcessedEmail));
  } catch (error) {
    console.error('Error fetching processed emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agent/processed-emails/:emailId - Get single processed email
router.get('/processed-emails/:emailId', async (req: AuthRequest, res: Response) => {
  const { emailId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM agent_processed_emails WHERE email_id = $1',
      [emailId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Processed email not found' });
    }

    res.json(formatProcessedEmail(result.rows[0]));
  } catch (error) {
    console.error('Error fetching processed email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ NOTIFICATIONS ============

// POST /api/agent/notifications - Create notification
router.post('/notifications', async (req: AuthRequest, res: Response) => {
  const { type, summary, actionUrl, candidateId, positionId, draftId, relatedEmailId, metadata } = req.body;

  if (!type || !summary) {
    return res.status(400).json({ error: 'type and summary are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO agent_notifications
       (type, summary, action_url, candidate_id, position_id, draft_id, related_email_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [type, summary, actionUrl, candidateId, positionId, draftId, relatedEmailId, metadata ? JSON.stringify(metadata) : null]
    );

    res.status(201).json(formatNotification(result.rows[0]));
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agent/notifications - List notifications
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string || 'pending';

  try {
    const result = await pool.query(
      'SELECT * FROM agent_notifications WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    res.json(result.rows.map(formatNotification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/agent/notifications/:id - Update notification status
router.put('/notifications/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE agent_notifications SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(formatNotification(result.rows[0]));
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ HELPERS ============

function formatProcessedEmail(row: any) {
  return {
    emailId: row.email_id,
    processedAt: row.processed_at,
    emailType: row.email_type,
    actionTaken: row.action_taken,
    draftId: row.draft_id,
    candidateId: row.candidate_id,
    positionId: row.position_id,
    summary: row.summary,
  };
}

function formatNotification(row: any) {
  return {
    id: row.id,
    createdAt: row.created_at,
    type: row.type,
    summary: row.summary,
    actionUrl: row.action_url,
    status: row.status,
    relatedEmailId: row.related_email_id,
    candidateId: row.candidate_id,
    positionId: row.position_id,
    draftId: row.draft_id,
    metadata: row.metadata,
  };
}

export default router;
