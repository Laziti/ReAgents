/**
 * Input validation utilities
 * Uses Zod for schema validation
 */

import * as z from 'zod';

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(10000),
  price: z.number().positive('Price must be positive').optional(),
  listingId: z.string().uuid('Invalid listing ID'),
  userId: z.string().uuid('Invalid user ID'),
};

/**
 * Rate limiting helper
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up old rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

