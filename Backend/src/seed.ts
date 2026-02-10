import bcrypt from 'bcryptjs';
import pool from './db.js';

async function seed() {
  console.log('Seeding database...');

  try {
    // Seed admin user
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable is required');
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, role = $4`,
      ['admin@hellio.com', passwordHash, 'Admin', 'admin']
    );
    console.log('Admin user created: admin@hellio.com (role: admin)');

    // Seed viewer user
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, role = $4`,
      ['viewer@hellio.com', passwordHash, 'Viewer', 'viewer']
    );
    console.log('Viewer user created: viewer@hellio.com (role: viewer)');

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
