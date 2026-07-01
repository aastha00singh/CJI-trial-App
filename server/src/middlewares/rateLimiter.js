import rateLimit from 'express-rate-limit';

/**
 * Rate limiter designed for costly AI-calling endpoints
 * Restricts each IP address to a maximum of 30 calls per 15-minute window
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, 
  message: {
    message: 'Too many requests to AI engines. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});
