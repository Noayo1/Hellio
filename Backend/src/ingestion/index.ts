/**
 * CLI entry point for document ingestion.
 *
 * Usage:
 *   npm run ingest -- --path ./CVsJobs/cvs --type cv --limit 5
 *   npm run ingest -- --path ./CVsJobs/cvs --type cv --limit 10 --dry-run
 */

import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { processDocument } from './pipeline.js';
import 'dotenv/config';

interface CliOptions {
  path: string;
  type: 'cv' | 'job';
  limit?: number;
  dryRun: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    path: '',
    type: 'cv',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--path':
      case '-p':
        options.path = nextArg;
        i++;
        break;
      case '--type':
      case '-t':
        if (nextArg === 'cv' || nextArg === 'job') {
          options.type = nextArg;
        }
        i++;
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(nextArg, 10);
        i++;
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
    }
  }

  return options;
}

async function discoverFiles(path: string, type: 'cv' | 'job'): Promise<string[]> {
  const stats = await stat(path);

  if (!stats.isDirectory()) {
    return [path];
  }

  const entries = await readdir(path);
  const files: string[] = [];
  const validExtensions = type === 'cv' ? ['.pdf', '.docx'] : ['.txt'];

  for (const entry of entries) {
    const ext = extname(entry).toLowerCase();
    if (validExtensions.includes(ext)) {
      files.push(join(path, entry));
    }
  }

  return files.sort();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.path) {
    console.error('Usage: npm run ingest -- --path <path> --type <cv|job> [--limit N] [--dry-run]');
    process.exit(1);
  }

  console.log('\n=== Document Ingestion Pipeline ===');
  console.log(`Path: ${options.path}`);
  console.log(`Type: ${options.type}`);
  if (options.limit) console.log(`Limit: ${options.limit} files`);
  if (options.dryRun) console.log('Mode: DRY RUN');
  console.log();

  let files: string[];
  try {
    files = await discoverFiles(options.path, options.type);
  } catch (error) {
    console.error(`Error reading path: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No matching files found.');
    process.exit(0);
  }

  console.log(`Found ${files.length} files\n`);

  const toProcess = options.limit ? files.slice(0, options.limit) : files;

  let success = 0;
  let failed = 0;

  for (const filePath of toProcess) {
    const fileName = filePath.split('/').pop() || filePath;
    process.stdout.write(`Processing: ${fileName}... `);

    const result = await processDocument({
      filePath,
      type: options.type,
      dryRun: options.dryRun,
    });

    if (result.success) {
      const detail = result.candidateId ? `Created: ${result.candidateId}` : 'Success';
      console.log(`OK ${detail}`);
      success++;
    } else {
      console.log(`FAILED ${result.errors?.[0] || 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total: ${toProcess.length}, Success: ${success}, Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
