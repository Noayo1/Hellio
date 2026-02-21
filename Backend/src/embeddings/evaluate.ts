/**
 * Evaluation script for embedding retrieval quality.
 * Run with: npm run evaluate-embeddings
 */

import pool from '../db.js';
import { findSimilarCandidates, findSimilarPositions } from './search.js';

async function evaluateEmbeddings() {
  console.log('='.repeat(60));
  console.log('EMBEDDING RETRIEVAL EVALUATION');
  console.log('='.repeat(60));
  console.log();

  // Get counts
  const candidateCount = await pool.query(
    'SELECT COUNT(*) FROM candidates WHERE embedding IS NOT NULL'
  );
  const positionCount = await pool.query(
    'SELECT COUNT(*) FROM positions WHERE embedding IS NOT NULL'
  );

  console.log(`Candidates with embeddings: ${candidateCount.rows[0].count}`);
  console.log(`Positions with embeddings: ${positionCount.rows[0].count}`);
  console.log(`Embedding model: amazon.titan-embed-text-v2:0`);
  console.log(`Similarity threshold: 0.6`);
  console.log();

  // Test 1: Find candidates for positions
  console.log('TEST 1: Position -> Candidate Matching');
  console.log('-'.repeat(40));

  const positions = await pool.query(
    `SELECT id, title, company FROM positions WHERE embedding IS NOT NULL LIMIT 3`
  );

  for (const position of positions.rows) {
    console.log(`\nPosition: ${position.title} at ${position.company}`);
    const candidates = await findSimilarCandidates(position.id, 5, 0.4);

    if (candidates.length === 0) {
      console.log('  No candidates found with similarity >= 0.4');
    } else {
      console.log('  Top candidates:');
      candidates.forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.name} (${(c.similarity * 100).toFixed(1)}%)`);
      });
    }
  }

  // Test 2: Find positions for candidates
  console.log('\n');
  console.log('TEST 2: Candidate -> Position Matching');
  console.log('-'.repeat(40));

  const candidates = await pool.query(
    `SELECT id, name FROM candidates WHERE embedding IS NOT NULL LIMIT 3`
  );

  for (const candidate of candidates.rows) {
    console.log(`\nCandidate: ${candidate.name}`);
    const suggestedPositions = await findSimilarPositions(candidate.id, 5, 0.4);

    if (suggestedPositions.length === 0) {
      console.log('  No positions found with similarity >= 0.4');
    } else {
      console.log('  Top positions:');
      suggestedPositions.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.title} at ${p.company} (${(p.similarity * 100).toFixed(1)}%)`);
      });
    }
  }

  // Test 3: Skill overlap analysis
  console.log('\n');
  console.log('TEST 3: Skill Overlap Analysis');
  console.log('-'.repeat(40));

  const skillAnalysis = await pool.query(`
    SELECT
      c.name as candidate_name,
      p.title as position_title,
      p.company,
      ARRAY(
        SELECT s.name FROM candidate_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.candidate_id = c.id
        INTERSECT
        SELECT s.name FROM position_skills ps
        JOIN skills s ON ps.skill_id = s.id
        WHERE ps.position_id = p.id
      ) as matching_skills
    FROM candidates c, positions p
    WHERE c.embedding IS NOT NULL AND p.embedding IS NOT NULL
    LIMIT 5
  `);

  for (const row of skillAnalysis.rows) {
    const matchCount = row.matching_skills?.length || 0;
    if (matchCount > 0) {
      console.log(`${row.candidate_name} <-> ${row.position_title}`);
      console.log(`  Matching skills (${matchCount}): ${row.matching_skills.join(', ')}`);
    }
  }

  // Test 4: Similarity distribution
  console.log('\n');
  console.log('TEST 4: Similarity Score Distribution');
  console.log('-'.repeat(40));

  if (positions.rows.length > 0) {
    const allSimilarities: number[] = [];
    for (const position of positions.rows) {
      const candidates = await findSimilarCandidates(position.id, 20, 0.0);
      candidates.forEach((c) => allSimilarities.push(c.similarity));
    }

    if (allSimilarities.length > 0) {
      allSimilarities.sort((a, b) => b - a);
      console.log(`Total pairs evaluated: ${allSimilarities.length}`);
      console.log(`Max similarity: ${(allSimilarities[0] * 100).toFixed(1)}%`);
      console.log(`Min similarity: ${(allSimilarities[allSimilarities.length - 1] * 100).toFixed(1)}%`);
      console.log(`Median: ${(allSimilarities[Math.floor(allSimilarities.length / 2)] * 100).toFixed(1)}%`);

      const above60 = allSimilarities.filter((s) => s >= 0.6).length;
      const above50 = allSimilarities.filter((s) => s >= 0.5).length;
      const above40 = allSimilarities.filter((s) => s >= 0.4).length;
      console.log(`Pairs above 60%: ${above60} (${((above60 / allSimilarities.length) * 100).toFixed(1)}%)`);
      console.log(`Pairs above 50%: ${above50} (${((above50 / allSimilarities.length) * 100).toFixed(1)}%)`);
      console.log(`Pairs above 40%: ${above40} (${((above40 / allSimilarities.length) * 100).toFixed(1)}%)`);
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('EVALUATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\nRun the export script to visualize embeddings in TensorFlow Projector:');
  console.log('  npm run export-embeddings-tsv');
  console.log('\nThen load the files at: https://projector.tensorflow.org/');

  await pool.end();
}

evaluateEmbeddings().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
