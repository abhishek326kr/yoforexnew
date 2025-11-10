import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Store for tracking failed login attempts per email/IP
const failedLoginAttempts = new Map<string, { count: number; firstAttempt: Date }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of failedLoginAttempts.entries()) {
    // Remove entries older than 1 hour
    if (now - data.firstAttempt.getTime() > 60 * 60 * 1000) {
      failedLoginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Rate limiter for login attempts - 5 attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.log(`[RATE LIMIT] Login blocked for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts. Please wait 15 minutes before trying again.'
    });
  }
});

// Rate limiter for registration - 3 accounts per hour per IP
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration requests per hour
  message: 'Too many accounts created from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.log(`[RATE LIMIT] Registration blocked for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many registration attempts. Please try again later.'
    });
  }
});

// Track failed login attempts per account for lockout
export function trackFailedLogin(identifier: string): boolean {
  const key = identifier.toLowerCase();
  const data = failedLoginAttempts.get(key);
  
  if (!data) {
    failedLoginAttempts.set(key, { count: 1, firstAttempt: new Date() });
    return false; // Not locked
  }
  
  // Reset if last attempt was over 1 hour ago
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (data.firstAttempt.getTime() < hourAgo) {
    failedLoginAttempts.set(key, { count: 1, firstAttempt: new Date() });
    return false; // Not locked
  }
  
  data.count++;
  
  // Lock account after 10 failed attempts
  if (data.count >= 10) {
    console.log(`[SECURITY] Account locked due to failed attempts: ${key}`);
    return true; // Account locked
  }
  
  return false; // Not locked yet
}

// Clear failed attempts on successful login
export function clearFailedAttempts(identifier: string): void {
  const key = identifier.toLowerCase();
  failedLoginAttempts.delete(key);
}

// Check if account is locked
export function isAccountLocked(identifier: string): boolean {
  const key = identifier.toLowerCase();
  const data = failedLoginAttempts.get(key);
  
  if (!data) return false;
  
  // Reset if last attempt was over 1 hour ago
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (data.firstAttempt.getTime() < hourAgo) {
    failedLoginAttempts.delete(key);
    return false;
  }
  
  return data.count >= 10;
}

// Password reset rate limiter - 3 requests per hour per email
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit to 3 password reset requests per hour
  message: 'Too many password reset requests',
  keyGenerator: (req: Request) => {
    // Use email as key if provided, otherwise fall back to default IP handling
    return req.body?.email || undefined;
  },
  handler: (req: Request, res: Response) => {
    console.log(`[RATE LIMIT] Password reset blocked for: ${req.body?.email || req.ip}`);
    res.status(429).json({
      error: 'Too many password reset requests. Please try again later.'
    });
  }
});