/**
 * Answer Generator - uses LLM to generate natural language answers from query results.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { invokeNova } from '../ingestion/extractors/bedrock.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load prompt template
const ANSWER_PROMPT_TEMPLATE = readFileSync(
  join(__dirname, 'prompts', 'answer-generation.v1.txt'),
  'utf-8'
);

export const ANSWER_PROMPT_VERSION = 'answer-v1';

export interface AnswerGenerationResult {
  answer: string;
  rawResponse: string;
  durationMs: number;
  promptVersion: string;
  error?: string;
}

/**
 * Generates a natural language answer from SQL query results.
 */
export async function generateAnswer(
  question: string,
  sql: string,
  rows: unknown[],
  rowCount: number,
  truncated: boolean
): Promise<AnswerGenerationResult> {
  // Format results for the prompt
  const resultsText = rows.length > 0
    ? JSON.stringify(rows, null, 2)
    : '(no results)';

  const truncatedNote = truncated ? ' - results truncated, more may exist' : '';

  // Build the prompt
  const prompt = ANSWER_PROMPT_TEMPLATE
    .replace('{question}', question)
    .replace('{sql}', sql)
    .replace('{row_count}', rowCount.toString())
    .replace('{truncated_note}', truncatedNote)
    .replace('{results}', resultsText);

  const response = await invokeNova(prompt);

  // Handle LLM errors
  if (response.error) {
    // Fallback: generate a simple answer from the data
    const fallbackAnswer = generateFallbackAnswer(rows, rowCount, truncated);
    return {
      answer: fallbackAnswer,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: ANSWER_PROMPT_VERSION,
      error: response.error,
    };
  }

  return {
    answer: response.text.trim(),
    rawResponse: response.text,
    durationMs: response.durationMs,
    promptVersion: ANSWER_PROMPT_VERSION,
  };
}

/**
 * Generates a simple fallback answer when LLM fails.
 */
function generateFallbackAnswer(rows: unknown[], rowCount: number, truncated: boolean): string {
  if (rowCount === 0) {
    return 'No matching records found.';
  }

  let answer = `Found ${rowCount} result${rowCount === 1 ? '' : 's'}.`;

  if (truncated) {
    answer += ' (Results were truncated - more may exist.)';
  }

  return answer;
}
