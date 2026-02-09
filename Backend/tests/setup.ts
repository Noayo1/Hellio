import { beforeAll, afterAll, beforeEach } from 'vitest';
import pool from '../src/db.js';

beforeAll(async () => {
  // Ensure database connection works
  await pool.query('SELECT 1');
});

beforeEach(async () => {
  // Clean database between tests
  await pool.query('DELETE FROM candidate_positions');
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM candidates');
  await pool.query('DELETE FROM positions');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});
