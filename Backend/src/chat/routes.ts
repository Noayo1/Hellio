/**
 * Chat API routes - SQL-RAG pipeline for answering questions about candidates and positions.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware.js';
import { generateSQL } from './sql-generator.js';
import { validateSQL } from './sql-validator.js';
import { executeSQL } from './sql-executor.js';
import { generateAnswer } from './answer-generator.js';

const router = Router();

interface ChatRequest {
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatResponse {
  answer?: string;
  trace?: {
    sql: string;
    rowCount: number;
    rows: unknown[];
    executionTimeMs: number;
  };
  error?: string;
  suggestion?: string;
}

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/chat
 * Main chat endpoint - receives a question, generates SQL, executes it, and returns a grounded answer.
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  const { question, history } = req.body as ChatRequest;

  // Validate input
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      error: 'Question is required',
      suggestion: 'Please provide a question about candidates or positions.',
    } as ChatResponse);
  }

  const trimmedQuestion = question.trim();

  try {
    // Step 1: Generate SQL from question (with conversation history for context)
    const sqlResult = await generateSQL(trimmedQuestion, history);

    // Handle irrelevant questions
    if (sqlResult.irrelevant) {
      return res.json({
        error: 'I can only answer questions about candidates and positions.',
        suggestion: 'Try asking about candidates, skills, job positions, or hiring data.',
      } as ChatResponse);
    }

    // Handle SQL generation errors
    if (sqlResult.error || !sqlResult.sql) {
      return res.json({
        error: 'I couldn\'t understand your question.',
        suggestion: 'Try rephrasing your question or being more specific.',
      } as ChatResponse);
    }

    // Step 2: Validate SQL for safety
    const validation = validateSQL(sqlResult.sql);
    if (!validation.valid) {
      return res.json({
        error: 'I cannot execute that type of query.',
        suggestion: 'Please ask a question about viewing data, not modifying it.',
      } as ChatResponse);
    }

    const safeSQL = validation.normalizedSQL || sqlResult.sql;

    // Step 3: Execute SQL
    const execResult = await executeSQL(safeSQL);

    // Handle execution errors
    if (execResult.error) {
      return res.json({
        error: 'There was an error running the query.',
        suggestion: 'Try asking a simpler question.',
        trace: {
          sql: safeSQL,
          rowCount: 0,
          rows: [],
          executionTimeMs: execResult.durationMs,
        },
      } as ChatResponse);
    }

    // Step 4: Generate grounded answer
    const answerResult = await generateAnswer(
      trimmedQuestion,
      safeSQL,
      execResult.rows,
      execResult.rowCount,
      execResult.truncated
    );

    // Return successful response with trace
    const response: ChatResponse = {
      answer: answerResult.answer,
      trace: {
        sql: safeSQL,
        rowCount: execResult.rowCount,
        rows: execResult.rows.slice(0, 20), // Limit rows in response for UI
        executionTimeMs: execResult.durationMs,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return res.json({
      error: 'The service is temporarily unavailable.',
      suggestion: 'Please try again in a moment.',
    } as ChatResponse);
  }
});

export default router;
