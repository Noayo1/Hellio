/**
 * Plain text file parser.
 */

export interface ParseResult {
  text: string;
  error?: string;
}

/**
 * Extract text from plain text buffer.
 */
export function parseTxt(buffer: Buffer): ParseResult {
  try {
    const text = buffer.toString('utf-8');
    return { text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown text parsing error';
    return { text: '', error: message };
  }
}
