import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Generate a new 2FA secret for a user
export async function generateTwoFactorSecret(userId: string, username: string) {
  const secret = speakeasy.generateSecret({
    name: `YoForex (${username})`,
    issuer: 'YoForex',
    length: 32
  });
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCodeUrl: await QRCode.toDataURL(secret.otpauth_url!)
  };
}

// Generate backup codes for 2FA
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

// Enable 2FA for a user
export async function enableTwoFactor(userId: string, secret: string, verificationCode: string): Promise<boolean> {
  try {
    // Verify the code first
    const isValid = verifyTwoFactorCode(secret, verificationCode);
    if (!isValid) {
      return false;
    }
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );
    
    // Update user with 2FA enabled
    await db.update(users)
      .set({
        twoFactorEnabled: true,
        twoFactorSecret: secret, // In production, encrypt this!
        twoFactorBackupCodes: hashedBackupCodes,
        twoFactorVerifiedAt: new Date(),
        twoFactorMethod: 'totp'
      })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error('[2FA] Error enabling 2FA:', error);
    return false;
  }
}

// Disable 2FA for a user
export async function disableTwoFactor(userId: string): Promise<void> {
  await db.update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorVerifiedAt: null,
      twoFactorMethod: 'totp'
    })
    .where(eq(users.id, userId));
}

// Verify a TOTP code
export function verifyTwoFactorCode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 2 time steps before/after for clock skew
  });
}

// Verify a backup code
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  try {
    const [user] = await db.select({
      backupCodes: users.twoFactorBackupCodes
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user?.backupCodes || user.backupCodes.length === 0) {
      return false;
    }
    
    // Check if any backup code matches
    for (let i = 0; i < user.backupCodes.length; i++) {
      const isMatch = await bcrypt.compare(code.toUpperCase(), user.backupCodes[i]);
      if (isMatch) {
        // Remove used backup code
        const newBackupCodes = [...user.backupCodes];
        newBackupCodes.splice(i, 1);
        
        await db.update(users)
          .set({
            twoFactorBackupCodes: newBackupCodes
          })
          .where(eq(users.id, userId));
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[2FA] Error verifying backup code:', error);
    return false;
  }
}

// Check if user has 2FA enabled
export async function hasTwoFactorEnabled(userId: string): Promise<boolean> {
  try {
    const [user] = await db.select({
      twoFactorEnabled: users.twoFactorEnabled
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    return user?.twoFactorEnabled || false;
  } catch (error) {
    console.error('[2FA] Error checking 2FA status:', error);
    return false;
  }
}

// Validate 2FA during login
export async function validateTwoFactor(userId: string, code: string): Promise<boolean> {
  try {
    const [user] = await db.select({
      twoFactorSecret: users.twoFactorSecret,
      twoFactorEnabled: users.twoFactorEnabled
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return true; // 2FA not enabled, allow login
    }
    
    // Try TOTP code first
    if (verifyTwoFactorCode(user.twoFactorSecret, code)) {
      return true;
    }
    
    // Try backup code
    return await verifyBackupCode(userId, code);
  } catch (error) {
    console.error('[2FA] Error validating 2FA:', error);
    return false;
  }
}