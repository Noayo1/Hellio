/**
 * LLM-based extraction using AWS Bedrock Nova.
 * Handles prompt construction and response parsing.
 */

import { invokeNova } from './bedrock.js';
import type { CandidateExtraction, JobExtraction } from '../validators/schema.js';
import {
  CV_EXTRACTION_PROMPT,
  CV_PROMPT_VERSION,
  JOB_EXTRACTION_PROMPT,
  JOB_PROMPT_VERSION,
} from '../prompts/index.js';

export interface LLMExtractionResult<T> {
  data: T | null;
  rawResponse: string;
  durationMs: number;
  promptVersion: string;
  error?: string;
}

/**
 * Parse JSON from LLM response.
 * Handles common LLM quirks like markdown code blocks.
 * Exported for testing.
 */
export function parseJsonResponse(response: string): unknown {
  let cleaned = response.trim();

  // Handle ```json ... ``` or ``` ... ``` format
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(cleaned);
}

/**
 * Extract candidate data from CV text using LLM.
 */
export async function extractCandidateWithLLM(
  text: string
): Promise<LLMExtractionResult<CandidateExtraction>> {
  const prompt = CV_EXTRACTION_PROMPT.replace('{text}', text);
  const response = await invokeNova(prompt);

  if (response.error) {
    return {
      data: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: CV_PROMPT_VERSION,
      error: response.error,
    };
  }

  try {
    const parsed = parseJsonResponse(response.text) as CandidateExtraction;
    return {
      data: parsed,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: CV_PROMPT_VERSION,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON parse error';
    return {
      data: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: CV_PROMPT_VERSION,
      error: `Failed to parse LLM response: ${message}`,
    };
  }
}

/**
 * Extract job data from description text using LLM.
 */
export async function extractJobWithLLM(
  text: string
): Promise<LLMExtractionResult<JobExtraction>> {
  const prompt = JOB_EXTRACTION_PROMPT.replace('{text}', text);
  const response = await invokeNova(prompt);

  if (response.error) {
    return {
      data: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: JOB_PROMPT_VERSION,
      error: response.error,
    };
  }

  try {
    const parsed = parseJsonResponse(response.text) as JobExtraction;
    return {
      data: parsed,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: JOB_PROMPT_VERSION,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON parse error';
    return {
      data: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
      promptVersion: JOB_PROMPT_VERSION,
      error: `Failed to parse LLM response: ${message}`,
    };
  }
}
