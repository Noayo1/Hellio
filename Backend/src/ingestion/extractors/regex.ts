/**
 * Regex-based extraction for deterministic fields.
 * Used before LLM to extract email, phone, LinkedIn, GitHub URLs.
 */

export interface RegexResults {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  candidateName: string | null;  // For CVs - extracted from first line
  contactName: string | null;  // For job descriptions - extracted from "From: Name <email>"
  contactEmail: string | null; // For job descriptions - alias for email
  jobTitle: string | null;     // For job descriptions - extracted from "Subject:" line
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
 * Handles URLs split across lines (e.g., "linkedin.com/in/john-\ndoe").
 */
export function extractLinkedIn(text: string): string | null {
  // First, try to fix line-broken URLs by removing newlines after hyphens in linkedin URLs
  const fixedText = text.replace(/(linkedin\.com\/in\/[\w-]*)-\s*\n\s*([\w-]+)/gi, '$1-$2');

  const pattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)(?=\s|$|[^a-zA-Z0-9_-])/gi;
  const match = pattern.exec(fixedText);
  return match ? `https://linkedin.com/in/${match[1]}` : null;
}

/**
 * Extract contact name from email header pattern.
 * Looks for "From: Name <email>" format common in job postings.
 */
export function extractContactName(text: string): string | null {
  const fromPattern = /From:\s*([^<\n]+?)(?:\s*<|$)/i;
  const match = fromPattern.exec(text);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extract job title from email subject line.
 * Cleans up common prefixes/suffixes like "Urgent -", "Needed", "Position".
 */
export function extractJobTitle(text: string): string | null {
  const subjectPattern = /Subject:\s*(.+)/i;
  const match = subjectPattern.exec(text);
  if (!match) return null;

  let title = match[1].trim();

  // Remove common prefixes
  title = title.replace(/^(urgent|important|re|fwd|fw)\s*[-:]\s*/gi, '');

  // Remove common suffixes
  title = title.replace(/\s*[-–]\s*(urgent|asap|needed|required|immediate|open|hiring)$/gi, '');
  title = title.replace(/\s+(needed|required|wanted|opening|position|role|job|vacancy)$/gi, '');

  return title.trim() || null;
}

/**
 * Extract GitHub URL from text. Returns normalized URL or null.
 * Handles URLs split across lines.
 */
export function extractGitHub(text: string): string | null {
  // First, try to fix line-broken URLs by removing newlines after hyphens in github URLs
  const fixedText = text.replace(/(github\.com\/[\w-]*)-\s*\n\s*([\w-]+)/gi, '$1-$2');

  const pattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)(?=\s|$|[^a-zA-Z0-9_-])/gi;
  const match = pattern.exec(fixedText);
  return match ? `https://github.com/${match[1]}` : null;
}

/**
 * Normalize name to Title Case (e.g., "AmAndA GArrison" → "Amanda Garrison")
 * Handles: hyphens (Mary-Jane), apostrophes (O'Brien), dots (Dr., J.)
 */
function toTitleCase(name: string): string {
  return name
    .split(/\s+/)
    .map(word => {
      // Single letter with dot (initial): J. → J.
      if (/^[a-zA-Z]\.$/.test(word)) {
        return word.toUpperCase();
      }
      // Titles with dot: Dr. → Dr., Mr. → Mr.
      if (/^(dr|mr|mrs|ms|prof|jr|sr)\.?$/i.test(word)) {
        const base = word.replace('.', '');
        return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase() + (word.endsWith('.') ? '.' : '');
      }
      // Handle hyphenated names (Mary-Jane → Mary-Jane)
      if (word.includes('-')) {
        return word.split('-').map(part =>
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('-');
      }
      // Handle apostrophes (O'Brien → O'Brien)
      if (word.includes("'")) {
        const parts = word.split("'");
        return parts.map(part =>
          part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''
        ).join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Extract candidate name from CV text.
 * Heuristic: Name is typically on the first non-empty line of a CV.
 * Supports: 2-6 words, dots (Dr., J.), hyphens (Mary-Jane), apostrophes (O'Brien)
 */
export function extractCandidateName(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Keywords that indicate a line is NOT a name
  const excludePatterns = [
    /^(email|phone|tel|mobile|address|location|contact|profile|summary|skills|experience|education|objective|about)[\s:]/i,
    /@/,  // Email
    /\d{3,}/,  // Phone numbers (3+ digits)
    /^(senior|junior|lead|staff|principal|intern|trainee)?\s*(software|web|full[- ]?stack|front[- ]?end|back[- ]?end|devops|qa|data|ml|ai|cloud|mobile|ios|android)?\s*(developer|engineer|architect|designer|manager|analyst|consultant|specialist|administrator|admin)/i,  // Job titles
    /linkedin\.com|github\.com|http/i,  // URLs
    /^[A-Z\s]+$/,  // ALL CAPS (section headers like "CONTACT", "PROFILE")
    /resume|curriculum|vitae|cv/i,  // Document type indicators
  ];

  for (const line of lines.slice(0, 5)) {  // Check first 5 non-empty lines
    // Skip if matches any exclude pattern
    if (excludePatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // Check if line looks like a name: 2-6 words
    // Each word can be: letters, hyphens, apostrophes, or end with dot (initials/titles)
    // Examples: "Dr. John A. Smith-Jones Jr.", "Mary O'Brien", "J. K. Rowling"
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 6) {
      const looksLikeName = words.every(word =>
        // Allow: letters, hyphens, apostrophes, trailing dot (for initials like "J." or titles like "Dr.")
        /^[a-zA-Z][a-zA-Z'.-]*$/i.test(word) && word.length >= 1
      );
      if (looksLikeName) {
        // Normalize to Title Case
        return toTitleCase(line);
      }
    }
  }

  return null;
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
  const email = extractEmail(textWithoutPhone);

  return {
    email,
    phone,
    linkedin: extractLinkedIn(processed),
    github: extractGitHub(processed),
    candidateName: extractCandidateName(text),  // Use original text for line-based extraction
    contactName: extractContactName(text),  // Use original text for header pattern
    contactEmail: email,                     // Same as email for job descriptions
    jobTitle: extractJobTitle(text),         // Extract from Subject line
  };
}
