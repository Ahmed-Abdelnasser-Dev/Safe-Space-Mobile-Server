import rateLimit from "express-rate-limit";

// Skip rate limiting in test environment
/** @returns {boolean} */
const skipInTest = () => process.env.NODE_ENV === "test";

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  skip: skipInTest,
  limit: 5, // 5 attempts per 15 minutes
  message: {
    error: "Too many authentication attempts. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Moderate rate limiter for password reset endpoints
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 attempts per hour
  message: {
    error: "Too many password reset attempts. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/**
 * Lenient rate limiter for token refresh
 */
export const refreshTokenRateLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 refreshes per 15 minutes
  message: {
    error: "Too many token refresh attempts.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/**
 * Email verification rate limiter
 */
export const emailVerificationRateLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 verification emails per hour
  message: {
    error: "Too many verification email requests.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
