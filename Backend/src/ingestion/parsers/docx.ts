/**
 * DOCX document parser using mammoth library.
 */

import mammoth from 'mammoth';

export interface ParseResult {
  text: string;
  error?: string;
}

/**
 * Extract text from DOCX buffer.
 */
export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown DOCX parsing error';
    return { text: '', error: message };
  }
}
