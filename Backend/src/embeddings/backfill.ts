/**
 * Backfill embeddings for existing candidates and positions.
 * Run with: npm run backfill-embeddings
 */

import pool from '../db.js';
import { updateCandidateEmbedding, updatePositionEmbedding } from './search.js';

async function backfillEntities(
  label: string,
  rows: Array<{ id: string; label: string }>,
  updateFn: (id: string) => Promise<boolean>
): Promise<void> {
  console.log(`Found ${rows.length} ${label}s without embeddings`);

  let success = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      if (await updateFn(row.id)) {
        success++;
        console.log(`  ✓ ${label}: ${row.label}`);
      } else {
        failed++;
        console.log(`  ✗ ${label}: ${row.label} (no data)`);
      }
    } catch (error) {
      failed++;
      console.error(`  ✗ ${label}: ${row.label} - ${error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n${label}s: ${success} success, ${failed} failed\n`);
}

async function backfillEmbeddings() {
  console.log('Starting embedding backfill...\n');

  const candidatesResult = await pool.query(
    'SELECT id, name FROM candidates WHERE embedding IS NULL ORDER BY created_at'
  );
  await backfillEntities(
    'Candidate',
    candidatesResult.rows.map((r) => ({ id: r.id, label: r.name })),
    updateCandidateEmbedding
  );

  const positionsResult = await pool.query(
    'SELECT id, title FROM positions WHERE embedding IS NULL ORDER BY created_at'
  );
  await backfillEntities(
    'Position',
    positionsResult.rows.map((r) => ({ id: r.id, label: r.title })),
    updatePositionEmbedding
  );

  console.log('Backfill complete.');
  await pool.end();
}

backfillEmbeddings().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
