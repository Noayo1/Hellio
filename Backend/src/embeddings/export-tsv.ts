/**
 * Export embeddings to TSV format for TensorFlow Projector visualization.
 * Run with: npm run export-embeddings-tsv
 *
 * Output files:
 * - embeddings.tsv: Vector data (tab-separated floats)
 * - metadata.tsv: Labels (name, type, skills)
 *
 * Load at: https://projector.tensorflow.org/
 */

import { writeFileSync } from 'fs';
import pool from '../db.js';

async function exportEmbeddingsToTSV() {
  console.log('Exporting embeddings to TSV format...\n');

  const embeddingsRows: string[] = [];
  const metadataRows: string[] = ['name\ttype\ttop_skills'];

  // Export candidate embeddings
  const candidates = await pool.query(`
    SELECT
      c.id,
      c.name,
      c.embedding,
      ARRAY(
        SELECT s.name FROM candidate_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.candidate_id = c.id
        LIMIT 5
      ) as skills
    FROM candidates c
    WHERE c.embedding IS NOT NULL
  `);

  console.log(`Found ${candidates.rows.length} candidates with embeddings`);

  for (const row of candidates.rows) {
    // Parse embedding vector
    const embeddingStr = row.embedding
      .slice(1, -1) // Remove [ and ]
      .split(',')
      .map((v: string) => parseFloat(v).toFixed(6))
      .join('\t');

    embeddingsRows.push(embeddingStr);

    const skills = row.skills?.slice(0, 3).join(', ') || 'N/A';
    metadataRows.push(`${row.name}\tcandidate\t${skills}`);
  }

  // Export position embeddings
  const positions = await pool.query(`
    SELECT
      p.id,
      p.title,
      p.company,
      p.embedding,
      ARRAY(
        SELECT s.name FROM position_skills ps
        JOIN skills s ON ps.skill_id = s.id
        WHERE ps.position_id = p.id
        LIMIT 5
      ) as skills
    FROM positions p
    WHERE p.embedding IS NOT NULL
  `);

  console.log(`Found ${positions.rows.length} positions with embeddings`);

  for (const row of positions.rows) {
    const embeddingStr = row.embedding
      .slice(1, -1)
      .split(',')
      .map((v: string) => parseFloat(v).toFixed(6))
      .join('\t');

    embeddingsRows.push(embeddingStr);

    const skills = row.skills?.slice(0, 3).join(', ') || 'N/A';
    metadataRows.push(`${row.title} @ ${row.company}\tposition\t${skills}`);
  }

  if (embeddingsRows.length === 0) {
    console.log('\nNo embeddings found. Run backfill-embeddings first.');
    await pool.end();
    return;
  }

  // Write files
  const outputDir = process.cwd();
  const embeddingsPath = `${outputDir}/embeddings.tsv`;
  const metadataPath = `${outputDir}/metadata.tsv`;

  writeFileSync(embeddingsPath, embeddingsRows.join('\n'));
  writeFileSync(metadataPath, metadataRows.join('\n'));

  console.log(`\nExported ${embeddingsRows.length} embeddings`);
  console.log(`\nFiles created:`);
  console.log(`  - ${embeddingsPath}`);
  console.log(`  - ${metadataPath}`);
  console.log(`\nTo visualize:`);
  console.log(`  1. Go to https://projector.tensorflow.org/`);
  console.log(`  2. Click "Load" in the left panel`);
  console.log(`  3. Upload embeddings.tsv as "Step 1: Load a TSV file of vectors"`);
  console.log(`  4. Upload metadata.tsv as "Step 2: Load a TSV file of metadata"`);
  console.log(`  5. Use UMAP or t-SNE for visualization`);

  await pool.end();
}

exportEmbeddingsToTSV().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
