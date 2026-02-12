/**
 * SQL Generator - uses LLM to generate SQL from natural language questions.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { invokeNova } from '../ingestion/extractors/bedrock.js';
import { getSchemaContext } from './schema-context.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load prompt template
const SQL_PROMPT_TEMPLATE = readFileSync(
  join(__dirname, 'prompts', 'sql-generation.v1.txt'),
  'utf-8'
);

export const SQL_PROMPT_VERSION = 'sql-v1';

export interface SQLGenerationResult {
  sql: string | null;
  rawResponse: string;
  durationMs: number;
  promptVersion: string;
  irrelevant?: boolean;
  error?: string;
}

/**
 * Generates SQL from a natural language question using LLM.
 */
export async function generateSQL(question: string): Promise<SQLGenerationResult> {
  // Build the prompt with schema context
  const prompt = SQL_PROMPT_TEMPLATE
    .replace('{schema}', getSchemaContext())
    .replace('{question}', question);

  const response = await invokeNova(prompt);

  // Handle LLM errors
  if (response.error) {
    return {
      sql: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: SQL_PROMPT_VERSION,
      error: response.error,
    };
  }

  const text = response.text.trim();

  // Check for irrelevant question
  if (text === 'IRRELEVANT') {
    return {
      sql: null,
      rawResponse: text,
      durationMs: response.durationMs,
      promptVersion: SQL_PROMPT_VERSION,
      irrelevant: true,
    };
  }

  // Clean up the SQL - remove any markdown code blocks if present
  let sql = text;
  if (sql.startsWith('```sql')) {
    sql = sql.slice(6);
  } else if (sql.startsWith('```')) {
    sql = sql.slice(3);
  }
  if (sql.endsWith('```')) {
    sql = sql.slice(0, -3);
  }
  sql = sql.trim();

  return {
    sql,
    rawResponse: text,
    durationMs: response.durationMs,
    promptVersion: SQL_PROMPT_VERSION,
  };
}
