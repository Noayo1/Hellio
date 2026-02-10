/**
 * Regex-based extraction for deterministic fields.
 * Used before LLM to extract email, phone, LinkedIn, GitHub URLs.
 */

export interface RegexResults {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
}

/**
 * Preprocess text to add spacing around common patterns.
 * PDF extraction often concatenates fields without spaces.
 */
function preprocessText(text: string): string {
  return text
    // Add space before @ if preceded by digits (phone before email)
    .replace(/(\d)([a-zA-Z]+@)/g, '$1 $2')
    // Add space before linkedin/github URLs
    .replace(/(\.com|\.org|\.net|\.io)([a-zA-Z])/gi, '$1 $2')
    // Add space after common TLDs followed by capital letters (email followed by location)
    .replace(/(\.com|\.org|\.net|\.io)([A-Z])/g, '$1 $2');
}

/**
 * Extract phone number from text. Returns first match or null.
 * Supports Israeli formats: landlines (02-09), mobile (05x), and test data (06x).
 */
export function extractPhone(text: string): string | null {
  // Matches: 050-123-4567, 052-1234567, 03-1234567, 060-8104346, +972-50-123-4567
  const pattern = /\+972[-\s]?[2-9][0-9]?[-\s]?\d{3}[-\s]?\d{4}|0[2-9][0-9]?[-\s]?\d{3}[-\s]?\d{4}/g;
  const matches = text.match(pattern);
  return matches ? matches[0].replace(/\s/g, '-') : null;
}

/**
 * Extract email from text. Returns first match or null.
 * Stricter pattern: TLD limited to 2-6 chars, must start with letter.
 */
export function extractEmail(text: string): string | null {
  // Stricter email pattern - local part must start with letter, TLD 2-6 chars
  const pattern = /[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}(?![a-zA-Z])/gi;
  const matches = text.match(pattern);
  return matches ? matches[0].toLowerCase() : null;
}

/**
 * Extract LinkedIn URL from text. Returns normalized URL or null.
 */
export function extractLinkedIn(text: string): string | null {
  const pattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+?)(?=github|linkedin|\s|$)/gi;
  const match = pattern.exec(text);
  return match ? `https://linkedin.com/in/${match[1]}` : null;
}

/**
 * Extract GitHub URL from text. Returns normalized URL or null.
 */
export function extractGitHub(text: string): string | null {
  const pattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+?)(?=github|linkedin|\s|$)/gi;
  const match = pattern.exec(text);
  return match ? `https://github.com/${match[1]}` : null;
}

/**
 * Extract all regex-based fields from text.
 */
export function extractWithRegex(text: string): RegexResults {
  // Preprocess to fix concatenated fields from PDF extraction
  const processed = preprocessText(text);

  // Extract phone first (most reliable pattern)
  const phone = extractPhone(processed);

  // Remove phone from text before extracting email to avoid conflicts
  const textWithoutPhone = phone ? processed.replace(phone, ' ') : processed;

  return {
    email: extractEmail(textWithoutPhone),
    phone,
    linkedin: extractLinkedIn(processed),
    github: extractGitHub(processed),
  };
}
