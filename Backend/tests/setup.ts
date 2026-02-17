import { beforeAll, afterAll, beforeEach } from 'vitest';
import pool from '../src/db.js';

beforeAll(async () => {
  // Ensure database connection works
  await pool.query('SELECT 1');
});

beforeEach(async () => {
  // Clean database between tests (in correct order respecting FK constraints)
  // Child tables first, then parent tables
  await pool.query('DELETE FROM experience_highlights');
  await pool.query('DELETE FROM experiences');
  await pool.query('DELETE FROM candidate_skills');
  await pool.query('DELETE FROM candidate_languages');
  await pool.query('DELETE FROM education');
  await pool.query('DELETE FROM certifications');
  await pool.query('DELETE FROM position_skills');
  await pool.query('DELETE FROM position_requirements');
  await pool.query('DELETE FROM candidate_positions');
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM candidates');
  await pool.query('DELETE FROM positions');
  await pool.query('DELETE FROM skills');
  await pool.query('DELETE FROM languages');
  await pool.query('DELETE FROM users');
  // Agent tables
  await pool.query('DELETE FROM agent_notifications');
  await pool.query('DELETE FROM agent_processed_emails');
});

afterAll(async () => {
  await pool.end();
});
