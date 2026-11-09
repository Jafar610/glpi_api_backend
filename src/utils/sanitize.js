/**
 * Sanitization utility for user ticket content before AI processing.
 * Removes HTML tags, decoded entities, emails, phone numbers, and common credential patterns.
 */

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#60;/g, '<')
    .replace(/&#62;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, ' ');
}

function sanitizeTicketContent(rawContent, maxLength = 3000) {
  if (!rawContent || typeof rawContent !== 'string') {
    return '';
  }

  // 1. Decode HTML entities and strip HTML markup
  let cleaned = decodeHtmlEntities(rawContent);
  cleaned = stripHtmlTags(cleaned);

  // 2. Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 3. Redact Email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

  // 4. Redact Phone numbers (common international and local phone patterns)
  cleaned = cleaned.replace(/(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g, '[PHONE_REDACTED]');

  // 5. Redact Password/Secret patterns
  cleaned = cleaned.replace(/(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');

  // 6. Enforce safe length limit to prevent model prompt bloat
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '... [TRUNCATED]';
  }

  return cleaned;
}

module.exports = {
  sanitizeTicketContent,
  stripHtmlTags,
  decodeHtmlEntities
};
