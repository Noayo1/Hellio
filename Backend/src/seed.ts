/**
 * Manual seed script - for testing or one-off seeding.
 * In normal workflow, seeding happens automatically via bootstrap on startup.
 */

import { seedUsers } from './bootstrap.js';
import pool from './db.js';

async function seed() {
  console.log('Running manual seed...');
  await seedUsers();
  console.log('Manual seed complete');
  await pool.end();
}

seed();
