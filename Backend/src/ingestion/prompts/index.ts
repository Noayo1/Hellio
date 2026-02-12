/**
 * Prompt loader with versioning.
 * Prompts are stored in .txt files for easy editing and version control.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load a prompt file from the prompts directory.
 */
function loadPrompt(filename: string): string {
  return readFileSync(join(__dirname, filename), 'utf-8');
}

// CV Extraction Prompt (v2 adds translation of non-English CVs to English)
export const CV_PROMPT_VERSION = 'cv-v2';
export const CV_EXTRACTION_PROMPT = loadPrompt('cv-extraction.v2.txt');

// Job Extraction Prompt
export const JOB_PROMPT_VERSION = 'job-v1';
export const JOB_EXTRACTION_PROMPT = loadPrompt('job-extraction.v1.txt');
