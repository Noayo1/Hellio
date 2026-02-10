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
- location: City/region (e.g., "Tel Aviv", "Be'er Sheva") or null if not specified
- yearsOfExperience: Number of years of relevant experience mentioned in the profile/summary (e.g., "5 years of experience" → 5, "1.5 years" → 1.5). Extract as a number, or null if not mentioned.
- skills: Array of TECHNICAL skills only (e.g., Python, Docker, AWS, Kubernetes) with {name, level}. Level is beginner/intermediate/advanced/expert OR null if not explicitly stated.
- languages: Array of spoken languages (e.g., ["Hebrew", "English", "Spanish"])
- experience: Array of {title, company, startDate (YYYY-MM), endDate (YYYY-MM or null), highlights: string[]}
- education: Array of {degree, institution, startDate?, endDate?, status?}. Status should ONLY be: "completed", "in progress", "expected YYYY", or null. Do NOT put highlights or achievements in status.
- certifications: Array of {name, year?}
- summary: 2-3 sentence professional bio

IMPORTANT:
- For skill levels, ONLY include a level if it is EXPLICITLY stated in the CV (e.g., "Python (advanced)", "Kubernetes (basics)"). If no level is mentioned, use null.
- DO NOT include spoken languages (Hebrew, English, Spanish, etc.) in the skills array. Skills should only be technical/professional skills.

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
- company: Company name. Extract from the job posting content, sender's signature, or email domain (e.g., "sarah@acme.com" → "Acme"). Do NOT use the recipient's email domain (e.g., NOT from "hr@hellio.com").
- location: Job location (optional)
- description: Comprehensive description extracted directly from the job posting. Include: the role overview, key responsibilities, team context, company info, and any unique aspects mentioned. Keep all relevant details from the original text (5-10 sentences). Do NOT summarize or shorten - preserve the important information.
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
