/**
 * PDF document parser using pdf-parse library.
 */

import pdf from 'pdf-parse';

export interface ParseResult {
  text: string;
  error?: string;
}

/**
 * Extract text from PDF buffer.
 */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdf(buffer);
    return { text: data.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PDF parsing error';
    return { text: '', error: message };
  }
}
