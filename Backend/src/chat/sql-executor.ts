/**
 * SQL Executor - executes validated SQL queries against the database.
 * Enforces row limits and handles errors gracefully.
 */

import pool from '../db.js';

export interface ExecutionResult {
  rows: unknown[];
  rowCount: number;
  durationMs: number;
  truncated: boolean;
  error?: string;
}

export const MAX_ROWS = 50;

/**
 * Executes a SQL query and returns the results.
 * Automatically enforces row limits and handles errors.
 */
export async function executeSQL(sql: string): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    // Add LIMIT if not present (safety net)
    let finalSQL = sql.trim();
    const upperSQL = finalSQL.toUpperCase();

    if (!upperSQL.includes('LIMIT')) {
      // Remove trailing semicolon if present, add LIMIT
      finalSQL = finalSQL.replace(/;\s*$/, '');
      finalSQL = `${finalSQL} LIMIT ${MAX_ROWS}`;
    } else {
      // Check if existing LIMIT is larger than MAX_ROWS
      const limitMatch = upperSQL.match(/LIMIT\s+(\d+)/);
      if (limitMatch) {
        const existingLimit = parseInt(limitMatch[1], 10);
        if (existingLimit > MAX_ROWS) {
          // Replace with MAX_ROWS
          finalSQL = finalSQL.replace(/LIMIT\s+\d+/i, `LIMIT ${MAX_ROWS}`);
        }
      }
    }

    const result = await pool.query(finalSQL);
    const actualRowCount = result.rowCount || 0;
    const rows = result.rows.slice(0, MAX_ROWS);

    return {
      rows,
      rowCount: rows.length,
      durationMs: Date.now() - startTime,
      truncated: actualRowCount > MAX_ROWS || rows.length < actualRowCount,
    };
  } catch (error) {
    return {
      rows: [],
      rowCount: 0,
      durationMs: Date.now() - startTime,
      truncated: false,
      error: error instanceof Error ? error.message : 'Query execution failed',
    };
  }
}
