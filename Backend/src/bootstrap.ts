/**
 * Bootstrap module - runs startup initialization tasks.
 * Called before the server starts listening.
 */

import bcrypt from 'bcryptjs';
import pool from './db.js';

/**
 * Seed required system users.
 * Idempotent - safe to call on every startup.
 */
export async function seedUsers(): Promise<void> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD not set, skipping user seeding');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const users = [
    { email: 'admin@hellio.com', name: 'Admin', role: 'admin' },
    { email: 'viewer@hellio.com', name: 'Viewer', role: 'viewer' },
  ];

  for (const user of users) {
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [user.email, passwordHash, user.name, user.role]
    );
  }

  console.log('Bootstrap: System users verified');
}

/**
 * Run all startup initialization tasks.
 */
export async function bootstrap(): Promise<void> {
  console.log('Running bootstrap...');
  await seedUsers();
  console.log('Bootstrap complete');
}
