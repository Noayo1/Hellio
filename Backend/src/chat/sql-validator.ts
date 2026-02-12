/**
 * SQL Validator - ensures only safe SELECT queries are executed.
 * Rejects destructive operations, multiple statements, and system table access.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedSQL?: string;
}

const MAX_QUERY_LENGTH = 2000;

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'COPY',
  'VACUUM',
  'REINDEX',
  'CLUSTER',
  'LOCK',
];

/**
 * Validates a SQL query for safety.
 * Only SELECT queries are allowed. Rejects destructive operations,
 * multiple statements, comments, and system table access.
 */
export function validateSQL(sql: string): ValidationResult {
  // Handle empty/whitespace input
  if (!sql || !sql.trim()) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  const trimmed = sql.trim();

  // Check max length
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: 'Query too long (max 2000 characters)' };
  }

  // Must start with SELECT (case-insensitive)
  if (!trimmed.toUpperCase().startsWith('SELECT')) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }

  // Check for SQL comments (could hide malicious code)
  if (/--/.test(trimmed)) {
    return { valid: false, error: 'SQL comments (--) are not allowed' };
  }
  if (/\/\*/.test(trimmed)) {
    return { valid: false, error: 'SQL block comments (/*) are not allowed' };
  }

  // Check for multiple statements (semicolon followed by non-whitespace)
  if (/;\s*\S/.test(trimmed)) {
    return { valid: false, error: 'Multiple statements are not allowed' };
  }

  // Check for forbidden keywords (even if hidden after SELECT)
  const upperSQL = trimmed.toUpperCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperSQL)) {
      return { valid: false, error: `Forbidden keyword: ${keyword}` };
    }
  }

  // Check for system table access
  if (/\bpg_/i.test(trimmed)) {
    return { valid: false, error: 'Access to system tables (pg_*) is not allowed' };
  }
  if (/\binformation_schema\b/i.test(trimmed)) {
    return { valid: false, error: 'Access to system tables (information_schema) is not allowed' };
  }

  // Remove trailing semicolon and whitespace for normalized output
  const normalizedSQL = trimmed.replace(/;\s*$/, '').trim();

  return {
    valid: true,
    normalizedSQL,
  };
}
