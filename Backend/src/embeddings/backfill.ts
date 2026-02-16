/**
 * Backfill embeddings for existing candidates and positions.
 * Run with: npm run backfill-embeddings
 */

import pool from '../db.js';
import { updateCandidateEmbedding, updatePositionEmbedding } from './search.js';

async function backfillEmbeddings() {
  console.log('Starting embedding backfill...\n');

  // Backfill candidates
  const candidatesResult = await pool.query(
    'SELECT id, name FROM candidates WHERE embedding IS NULL ORDER BY created_at'
  );
  console.log(`Found ${candidatesResult.rows.length} candidates without embeddings`);

  let candidateSuccess = 0;
  let candidateFailed = 0;
  for (const candidate of candidatesResult.rows) {
    try {
      const success = await updateCandidateEmbedding(candidate.id);
      if (success) {
        candidateSuccess++;
        console.log(`  ✓ Candidate: ${candidate.name}`);
      } else {
        candidateFailed++;
        console.log(`  ✗ Candidate: ${candidate.name} (no data)`);
      }
    } catch (error) {
      candidateFailed++;
      console.error(`  ✗ Candidate: ${candidate.name} - ${error}`);
    }
    // Rate limiting: 100ms delay to avoid API throttling
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `\nCandidates: ${candidateSuccess} success, ${candidateFailed} failed\n`
  );

  // Backfill positions
  const positionsResult = await pool.query(
    'SELECT id, title FROM positions WHERE embedding IS NULL ORDER BY created_at'
  );
  console.log(`Found ${positionsResult.rows.length} positions without embeddings`);

  let positionSuccess = 0;
  let positionFailed = 0;
  for (const position of positionsResult.rows) {
    try {
      const success = await updatePositionEmbedding(position.id);
      if (success) {
        positionSuccess++;
        console.log(`  ✓ Position: ${position.title}`);
      } else {
        positionFailed++;
        console.log(`  ✗ Position: ${position.title} (no data)`);
      }
    } catch (error) {
      positionFailed++;
      console.error(`  ✗ Position: ${position.title} - ${error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `\nPositions: ${positionSuccess} success, ${positionFailed} failed`
  );
  console.log('\nBackfill complete.');

  await pool.end();
}

backfillEmbeddings().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
