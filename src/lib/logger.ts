/**
 * Production-safe logging utility
 * Removes all console logs in production builds
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, send to error tracking service
      // Example: Sentry, LogRocket, etc.
      console.error('[Error]', args[0]);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

