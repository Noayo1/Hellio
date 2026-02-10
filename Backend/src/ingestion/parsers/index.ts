/**
 * Document parser module.
 * Selects appropriate parser based on file type.
 */

import { parsePdf } from './pdf.js';
import { parseDocx } from './docx.js';
import { parseTxt } from './txt.js';
import { readFile } from 'fs/promises';

export interface ParseResult {
  text: string;
  buffer?: Buffer;
  error?: string;
  durationMs: number;
}

/**
 * Determine file type from extension or mime type.
 */
function getFileType(fileName: string, mimeType?: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    ext === 'docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (ext === 'txt' || mimeType === 'text/plain') {
    return 'txt';
  }

  return 'unknown';
}

/**
 * Parse document from buffer.
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ParseResult> {
  const startTime = Date.now();
  const fileType = getFileType(fileName, mimeType);

  let result: { text: string; error?: string };

  switch (fileType) {
    case 'pdf':
      result = await parsePdf(buffer);
      break;
    case 'docx':
      result = await parseDocx(buffer);
      break;
    case 'txt':
      result = parseTxt(buffer);
      break;
    default:
      result = { text: '', error: `Unsupported file type: ${fileName}` };
  }

  return {
    ...result,
    buffer,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Parse document from file path.
 */
export async function parseDocumentFromPath(filePath: string): Promise<ParseResult> {
  try {
    const buffer = await readFile(filePath);
    const fileName = filePath.split('/').pop() || filePath;
    const result = await parseDocument(buffer, fileName);
    return { ...result, buffer };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown file read error';
    return { text: '', error: message, durationMs: 0 };
  }
}
