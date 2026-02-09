import { config } from 'dotenv';
import { join } from 'path';
import pg from 'pg';

// Load .env from project root (for running from Backend dir)
config({ path: join(process.cwd(), '..', '.env') });
// Also try current directory (for running from root)
config({ path: join(process.cwd(), '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
