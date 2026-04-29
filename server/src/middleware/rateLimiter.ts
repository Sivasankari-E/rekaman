import rateLimit from 'express-rate-limit';

// Disable rate limiting in tests so a single suite can spam signup/login
// without tripping the production limits. Production behavior unchanged.
const skipInTests = () => process.env.NODE_ENV === 'test';

/**
 * Stricter rate limit for auth endpoints (signup, login, OAuth).
 * 5 requests per IP per hour.
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Try again in an hour.',
  },
});

/**
 * Standard rate limit for authenticated API endpoints.
 * 100 requests per IP per minute.
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Slow down.',
  },
});
