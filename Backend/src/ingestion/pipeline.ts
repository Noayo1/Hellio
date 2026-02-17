/**
 * Main ingestion pipeline orchestrator.
 */

import { parseDocument, parseDocumentFromPath } from './parsers/index.js';
import { extractWithRegex } from './extractors/regex.js';
import { extractCandidateWithLLM, extractJobWithLLM } from './extractors/llm.js';
import { validateCandidateData, validateJobData, type CandidateExtraction, type JobExtraction } from './validators/schema.js';
import {
  createExtractionLog,
  updateExtractionLog,
  persistCandidate,
  persistJob,
} from './persistence.js';
import {
  updateCandidateEmbedding,
  updatePositionEmbedding,
} from '../embeddings/search.js';

async function safeUpdateEmbedding(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error('Embedding generation failed (non-fatal):', error);
  }
}

export interface DocumentInput {
  buffer?: Buffer;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  type: 'cv' | 'job';
  dryRun?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  candidateId?: string;
  candidateName?: string;
  positionId?: string;
  positionTitle?: string;
  extractionLogId: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Process a single document through the ingestion pipeline.
 */
export async function processDocument(input: DocumentInput): Promise<ExtractionResult> {
  const startTime = Date.now();
  const sourceFilePath = input.filePath || input.fileName || 'upload';

  const logId = await createExtractionLog(sourceFilePath, input.type);

  try {
    // Stage 1: Parse document
    let parseResult;
    if (input.buffer && input.fileName) {
      parseResult = await parseDocument(input.buffer, input.fileName, input.mimeType);
    } else if (input.filePath) {
      parseResult = await parseDocumentFromPath(input.filePath);
    } else {
      throw new Error('Either buffer+fileName or filePath must be provided');
    }

    await updateExtractionLog(logId, {
      rawText: parseResult.text,
      parseDurationMs: parseResult.durationMs,
    });

    if (parseResult.error) {
      await updateExtractionLog(logId, {
        status: 'failed',
        errorMessage: `[parse] ${parseResult.error}`,
      });
      return { success: false, extractionLogId: logId, errors: [parseResult.error] };
    }

    if (!parseResult.text.trim()) {
      await updateExtractionLog(logId, {
        status: 'failed',
        errorMessage: '[parse] Document is empty or unreadable',
      });
      return { success: false, extractionLogId: logId, errors: ['Document is empty or unreadable'] };
    }

    // Stage 2: Regex extraction
    const regexResults = extractWithRegex(parseResult.text);
    await updateExtractionLog(logId, { regexResults });

    // Stage 3: LLM extraction
    let llmResult;
    if (input.type === 'cv') {
      llmResult = await extractCandidateWithLLM(parseResult.text);
    } else {
      llmResult = await extractJobWithLLM(parseResult.text);
    }

    await updateExtractionLog(logId, {
      llmRawResponse: llmResult.rawResponse,
      llmParsedData: llmResult.data,
      llmDurationMs: llmResult.durationMs,
      promptVersion: llmResult.promptVersion,
    });

    if (llmResult.error) {
      await updateExtractionLog(logId, {
        status: 'failed',
        errorMessage: `[llm] ${llmResult.error}`,
      });
      return { success: false, extractionLogId: logId, errors: [llmResult.error] };
    }

    // Stage 4: Validation
    const validation = input.type === 'cv'
      ? validateCandidateData(llmResult.data)
      : validateJobData(llmResult.data);

    if (!validation.valid) {
      await updateExtractionLog(logId, {
        status: 'failed',
        validationErrors: validation.errors,
        errorMessage: `[validation] ${validation.errors.join('; ')}`,
      });
      return { success: false, extractionLogId: logId, errors: validation.errors };
    }

    // Stage 5: Persistence (skip if dry run)
    if (input.dryRun) {
      await updateExtractionLog(logId, {
        status: 'success',
        totalDurationMs: Date.now() - startTime,
      });
      return { success: true, extractionLogId: logId, warnings: ['Dry run - no data persisted'] };
    }

    // Stage 5b: Persist and generate embedding
    if (input.type === 'cv') {
      const fileBuffer = input.buffer || parseResult.buffer;
      const candidateData = validation.data as CandidateExtraction;
      const candidateId = await persistCandidate(
        candidateData,
        regexResults,
        logId,
        fileBuffer,
        input.fileName || input.filePath?.split('/').pop()
      );
      await updateExtractionLog(logId, {
        status: 'success',
        candidateId,
        totalDurationMs: Date.now() - startTime,
      });
      await safeUpdateEmbedding(() => updateCandidateEmbedding(candidateId));
      return { success: true, candidateId, candidateName: candidateData.name, extractionLogId: logId };
    }

    const jobData = validation.data as JobExtraction;
    const positionId = await persistJob(jobData, regexResults, logId);
    await updateExtractionLog(logId, {
      status: 'success',
      totalDurationMs: Date.now() - startTime,
    });
    await safeUpdateEmbedding(() => updatePositionEmbedding(positionId));
    return { success: true, positionId, positionTitle: jobData.title, extractionLogId: logId };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await updateExtractionLog(logId, {
      status: 'failed',
      errorMessage: `[unexpected] ${message}`,
      totalDurationMs: Date.now() - startTime,
    });
    return { success: false, extractionLogId: logId, errors: [message] };
  }
}
