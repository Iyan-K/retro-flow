/**
 * Input sanitization utilities to prevent injection attacks (XSS, NoSQL injection, etc.).
 *
 * Although Angular's template binding already escapes HTML for display,
 * these helpers ensure that data stored in Firestore is clean and within
 * safe limits.
 */

/** Maximum allowed lengths for each field type. */
export const MAX_LENGTHS = {
  username: 50,
  roomCode: 10,
  postContent: 5000,
  comment: 2000,
} as const;

/**
 * Strip characters commonly used in injection attacks while keeping
 * normal text intact.  Removes:
 *   - HTML tags
 *   - Script-like patterns (javascript:, on…=)
 *   - Common SQL / NoSQL injection tokens
 */
export function sanitizeInput(value: string, maxLength: number): string {
  let sanitized = value.trim();

  // Enforce length limit
  sanitized = sanitized.slice(0, maxLength);

  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove javascript: / data: URI patterns (case-insensitive)
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/data\s*:/gi, '');

  // Remove inline event handlers (onerror=, onclick=, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');

  // Neutralize common SQL injection tokens
  sanitized = sanitized.replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|EXEC|EXECUTE|CREATE|TRUNCATE)\b/gi, '');

  // Remove SQL comment sequences and semicolons used for statement chaining
  sanitized = sanitized.replace(/--|\/\*|\*\/|;/g, '');

  // Remove $-prefixed keys that could manipulate NoSQL queries
  // (e.g. $gt, $ne, $regex, $where)
  sanitized = sanitized.replace(/\$[a-zA-Z_]+/g, '');

  return sanitized.trim();
}

/** Sanitize a username. */
export function sanitizeUsername(value: string): string {
  return sanitizeInput(value, MAX_LENGTHS.username);
}

/** Sanitize a room code – only uppercase alphanumeric allowed. */
export function sanitizeRoomCode(value: string): string {
  const trimmed = value.trim().toUpperCase();
  // Keep only alphanumeric characters
  return trimmed.replace(/[^A-Z0-9]/g, '').slice(0, MAX_LENGTHS.roomCode);
}

/** Sanitize post content. */
export function sanitizePostContent(value: string): string {
  return sanitizeInput(value, MAX_LENGTHS.postContent);
}

/** Sanitize a comment. */
export function sanitizeComment(value: string): string {
  return sanitizeInput(value, MAX_LENGTHS.comment);
}
