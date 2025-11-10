/**
 * Input sanitization utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize HTML string to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Sanitize user input for database queries
 * Note: Supabase handles SQL injection, but this adds extra safety
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_') // Prevent path traversal
    .slice(0, 255); // Limit length
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 255);
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Limit length
  return cleaned.slice(0, 20);
}

