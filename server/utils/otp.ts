import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a 6-digit numeric OTP code
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 1_000_000).toString();
}

/**
 * Hash OTP code using bcrypt (same as passwords)
 */
export async function hashOTP(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
}

/**
 * Verify OTP code against hash
 */
export async function verifyOTPHash(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Calculate expiration timestamp (10 minutes from now)
 */
export function getOTPExpiration(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);
  return now;
}
