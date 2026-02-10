/**
 * LLM-based extraction using AWS Bedrock Nova.
 * Handles prompt construction and response parsing.
 */

import { invokeNova } from './bedrock.js';
import type { CandidateExtraction, JobExtraction } from '../validators/schema.js';

export interface LLMExtractionResult<T> {
  data: T | null;
  rawResponse: string;
  durationMs: number;
  error?: string;
}

/**
 * Prompt template for CV extraction.
 */
const CV_EXTRACTION_PROMPT = `You are extracting structured data from a CV/resume. Return ONLY valid JSON, no additional text.

Extract:
- name: Full name (string)
- skills: Array of {name, level} where level is beginner/intermediate/advanced/expert
- experience: Array of {title, company, startDate (YYYY-MM), endDate (YYYY-MM or null), highlights: string[]}
- education: Array of {degree, institution, startDate?, endDate?, status?}
- certifications: Array of {name, year?}
- summary: 2-3 sentence professional bio

CV Text:
---
{text}
---

Return ONLY JSON.`;

/**
 * Prompt template for job description extraction.
 */
const JOB_EXTRACTION_PROMPT = `You are extracting structured data from a job description. Return ONLY valid JSON, no additional text.

Extract:
- title: Job title (string)
- company: Company name (string)
- location: Job location (optional)
- description: Brief job description
- requirements: Array of {text, required: boolean}
- skills: Array of skill names
- experienceYears: Required years (number, optional)
- workType: remote/onsite/hybrid (optional)
- salary: Salary info (optional)
- contactName, contactEmail (optional)

Job Description:
---
{text}
---

Return ONLY JSON.`;

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
      error: response.error,
    };
  }

  try {
    const parsed = parseJsonResponse(response.text) as CandidateExtraction;
    return {
      data: parsed,
      rawResponse: response.text,
      durationMs: response.durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON parse error';
    return {
      data: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
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
      error: response.error,
    };
  }

  try {
    const parsed = parseJsonResponse(response.text) as JobExtraction;
    return {
      data: parsed,
      rawResponse: response.text,
      durationMs: response.durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON parse error';
    return {
      data: null,
      rawResponse: response.text,
      durationMs: response.durationMs,
      error: `Failed to parse LLM response: ${message}`,
    };
  }
}
