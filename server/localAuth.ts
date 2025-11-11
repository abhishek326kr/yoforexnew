import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { users, passwordResetTokens, emailVerificationTokens, coinTransactions, COIN_TRIGGERS, COIN_CHANNELS } from "../shared/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { 
  loginRateLimiter, 
  registerRateLimiter, 
  passwordResetRateLimiter,
  trackFailedLogin,
  clearFailedAttempts,
  isAccountLocked 
} from "./middleware/rateLimiter";
import { CoinTransactionService } from "./services/coinTransactionService";

// Validation schemas
const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and dashes"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  email: z.string().email("Invalid email address").optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
});

// Hash password with bcrypt
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password with bcrypt
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Setup local authentication strategy
export async function setupLocalAuth(app: Express) {
  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          // Find user by username or email
          let [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);
          
          if (!user) {
            // Also check by email if username not found
            const [userByEmail] = await db
              .select()
              .from(users)
              .where(eq(users.email, username))
              .limit(1);
            
            if (!userByEmail) {
              return done(null, false, { message: "Invalid username or password" });
            }
            
            // Found by email, continue with that user
            user = userByEmail;
          }
          
          // Check if user has a password (check both legacy and new fields)
          const passwordHash = user.password_hash || user.password;
          if (!passwordHash) {
            return done(null, false, { 
              message: "This account does not have a password set. Please use Google Sign-In or reset your password." 
            });
          }
          
          // Verify password
          const isValidPassword = await verifyPassword(password, passwordHash);
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid username or password" });
          }
          
          // Check if account is banned or suspended
          if (user.status === "banned") {
            return done(null, false, { message: "Account has been banned" });
          }
          
          if (user.status === "suspended" && user.suspendedUntil) {
            const now = new Date();
            if (now < user.suspendedUntil) {
              return done(null, false, { 
                message: `Account is suspended until ${user.suspendedUntil.toLocaleString()}` 
              });
            }
            
            // Suspension expired, update status
            await db
              .update(users)
              .set({ status: "active", suspendedUntil: null })
              .where(eq(users.id, user.id));
          }
          
          // Update last active timestamp
          await db
            .update(users)
            .set({ lastActive: new Date() })
            .where(eq(users.id, user.id));
          
          // Return user object for session
          const sessionUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            sessionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          };
          
          return done(null, sessionUser);
        } catch (error) {
          console.error("[LOCAL AUTH] Login error:", error);
          return done(error);
        }
      }
    )
  );
  
  // Login endpoint with rate limiting and remember me
  app.post("/api/login", loginRateLimiter, async (req, res, next) => {
    try {
      // Validate input
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid username or password",
          details: validation.error.errors 
        });
      }
      
      const { email, password, rememberMe } = validation.data;
      
      // Check if account is locked due to failed attempts
      if (isAccountLocked(email)) {
        return res.status(403).json({
          error: "Account temporarily locked due to multiple failed login attempts. Please try again in 1 hour."
        });
      }
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          console.error("[LOCAL AUTH] Authentication error:", err);
          return res.status(500).json({ error: "Authentication system error. Please try again." });
        }
        
        if (!user) {
          // Track failed attempt
          const isLocked = trackFailedLogin(email);
          if (isLocked) {
            return res.status(403).json({ 
              error: "Account temporarily locked due to multiple failed login attempts. Please try again in 1 hour."
            });
          }
          return res.status(401).json({ 
            error: info?.message || "Invalid username or password" 
          });
        }
        
        // Clear failed attempts on successful authentication
        clearFailedAttempts(email);
        
        // Adjust session expiry based on rememberMe flag
        if (rememberMe) {
          user.sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        } else {
          user.sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
        
        req.logIn(user, (err) => {
          if (err) {
            console.error("[LOCAL AUTH] Session error:", err);
            return res.status(500).json({ error: "Failed to create session. Please try again." });
          }
          
          // Set session cookie with appropriate max age
          if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          }
          
          // Return user info (without sensitive data)
          res.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
              role: user.role,
              totalCoins: user.totalCoins,
            },
            sessionExpiry: user.sessionExpiry,
          });
        });
      })(req, res, next);
    } catch (error: any) {
      console.error("[LOCAL AUTH] Login endpoint error:", error);
      res.status(500).json({ error: "Login system error. Please try again later." });
    }
  });
  
  // Register endpoint with rate limiting and coin transaction
  if (process.env.ALLOW_REGISTRATION !== "false") {
    app.post("/api/register", registerRateLimiter, async (req, res) => {
      try {
        // Validate input
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          let errorMessage = "Registration information is incomplete or invalid";
          
          if (firstError?.path.includes('username')) {
            errorMessage = "Username must be 3-30 characters and contain only letters, numbers, underscores, and dashes";
          } else if (firstError?.path.includes('email')) {
            errorMessage = "Please provide a valid email address";
          } else if (firstError?.path.includes('password')) {
            errorMessage = "Password must be at least 8 characters long";
          }
          
          return res.status(400).json({ 
            error: errorMessage,
            details: validation.error.errors 
          });
        }
        
        const { username, password, email, firstName, lastName } = validation.data;
        
        // Check if username already exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        
        if (existingUser) {
          return res.status(409).json({ error: "Username already taken. Please choose a different one." });
        }
        
        // Check if email already exists (if provided)
        if (email) {
          const [existingEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          
          if (existingEmail) {
            return res.status(409).json({ error: "This email address is already registered. Please use a different email or try logging in." });
          }
        }
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Create user (start with 0 coins, will be awarded via CoinTransactionService)
        const [newUser] = await db
          .insert(users)
          .values({
            username,
            password: hashedPassword,
            email: email || null,
            firstName: firstName || null,
            lastName: lastName || null,
            role: "member",
            status: "active",
            totalCoins: 0, // Will be awarded via CoinTransactionService
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        // Award welcome bonus using CoinTransactionService
        try {
          const coinService = new CoinTransactionService();
          const result = await coinService.executeTransaction({
            userId: newUser.id,
            amount: 100,
            trigger: COIN_TRIGGERS.SYSTEM_WELCOME_BONUS,
            channel: COIN_CHANNELS.SYSTEM,
            description: 'Welcome bonus',
            metadata: { registrationDate: new Date().toISOString() },
            idempotencyKey: `welcome-bonus-${newUser.id}`
          });
          
          if (result.success) {
            console.log(`[WELCOME BONUS] Awarded 100 coins to user ${newUser.username}`);
          } else {
            console.error("[WELCOME BONUS] Failed to award coins:", result.error);
            // Don't fail registration if coin transaction fails
          }
        } catch (coinError) {
          console.error("[WELCOME BONUS] Failed to create coin transaction:", coinError);
          // Don't fail registration if coin transaction fails
        }
        
        // Send welcome/verification email if email provided
        if (email) {
          try {
            // Generate secure verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            // Store token in database
            await db.insert(emailVerificationTokens).values({
              userId: newUser.id,
              email: email,
              token: verificationToken,
              expiresAt,
              createdAt: new Date(),
            });
            
            // Send welcome email with verification link
            const { emailService } = await import('./services/emailService');
            await emailService.sendEmailVerification(
              email,
              newUser.username,
              verificationToken
            );
            
            console.log(`[WELCOME EMAIL] Sent verification email to: ${email}`);
          } catch (emailError: any) {
            console.error("[WELCOME EMAIL] Failed to send verification email:", emailError);
            // Don't fail registration if email fails
          }
        }
        
        // Auto-login after registration
        const sessionUser = {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileImageUrl: newUser.profileImageUrl,
          role: newUser.role,
          sessionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        
        req.logIn(sessionUser, (err) => {
          if (err) {
            console.error("[LOCAL AUTH] Auto-login error:", err);
            // Registration succeeded but auto-login failed
            return res.json({
              success: true,
              message: "Registration successful. Please login.",
            });
          }
          
          res.json({
            success: true,
            message: "Registration successful",
            user: {
              id: newUser.id,
              username: newUser.username,
              email: newUser.email,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              role: newUser.role,
            },
          });
        });
      } catch (error: any) {
        console.error("[LOCAL AUTH] Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
      }
    });
  }
  
  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("[LOCAL AUTH] Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      // Clear session cookie
      req.session.destroy((err) => {
        if (err) {
          console.error("[LOCAL AUTH] Session destroy error:", err);
        }
        
        res.clearCookie("yoforex.sid");
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });
  
  // Forgot Password - Send reset token via email with rate limiting
  app.post("/api/auth/forgot-password", passwordResetRateLimiter, async (req, res) => {
    try {
      // Validate input
      const validation = forgotPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input",
          details: validation.error.errors 
        });
      }
      
      const { email } = validation.data;
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      // Always return success to prevent email enumeration attacks
      // Don't reveal whether the email exists or not
      if (!user) {
        console.log(`[FORGOT PASSWORD] Email not found: ${email}`);
        return res.json({ 
          success: true, 
          message: "If the email exists, a password reset link has been sent." 
        });
      }
      
      // Generate secure random token (32 bytes = 64 hex characters)
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Hash the token before storing
      const tokenHash = await hashPassword(resetToken);
      
      // Calculate expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Store token in database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
        consumed: false,
      });
      
      // Send password reset email
      try {
        const { emailService } = await import('./services/emailService');
        await emailService.sendPasswordReset(email, resetToken, '1 hour');
        console.log(`[FORGOT PASSWORD] Reset email sent to: ${email}`);
      } catch (emailError: any) {
        console.error('[FORGOT PASSWORD] Failed to send email:', emailError);
        // Continue anyway - we don't want to reveal email sending failures
      }
      
      res.json({ 
        success: true, 
        message: "If the email exists, a password reset link has been sent." 
      });
    } catch (error: any) {
      console.error("[FORGOT PASSWORD] Error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });
  
  // Reset Password - Validate token and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      // Validate input
      const validation = resetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input",
          details: validation.error.errors 
        });
      }
      
      const { token, newPassword } = validation.data;
      
      // Find all non-consumed, non-expired tokens
      const now = new Date();
      const allTokens = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.consumed, false),
            gt(passwordResetTokens.expiresAt, now)
          )
        );
      
      // Find matching token by comparing hashes
      let matchingToken = null;
      for (const dbToken of allTokens) {
        const isMatch = await verifyPassword(token, dbToken.tokenHash);
        if (isMatch) {
          matchingToken = dbToken;
          break;
        }
      }
      
      if (!matchingToken) {
        return res.status(400).json({ 
          error: "Invalid or expired reset token",
          message: "The reset link is invalid or has expired. Please request a new one." 
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user password
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, matchingToken.userId));
      
      // Mark token as consumed
      await db
        .update(passwordResetTokens)
        .set({ 
          consumed: true,
          consumedAt: new Date(),
        })
        .where(eq(passwordResetTokens.id, matchingToken.id));
      
      console.log(`[RESET PASSWORD] Password reset successful for user: ${matchingToken.userId}`);
      
      res.json({ 
        success: true, 
        message: "Password reset successfully. You can now login with your new password." 
      });
    } catch (error: any) {
      console.error("[RESET PASSWORD] Error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  
  // Email verification endpoint
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }
      
      // Find valid, non-expired verification token
      const [verificationRecord] = await db
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.token, token),
            gt(emailVerificationTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!verificationRecord) {
        return res.status(400).json({ 
          error: "Invalid or expired verification link",
          message: "The verification link is invalid or has expired. Please request a new verification email." 
        });
      }
      
      // Update user's email verification status
      await db
        .update(users)
        .set({ 
          is_email_verified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, verificationRecord.userId));
      
      // Delete the verification token (single-use)
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.id, verificationRecord.id));
      
      console.log(`[EMAIL VERIFICATION] Email verified for user: ${verificationRecord.userId}`);
      
      res.json({ 
        success: true, 
        message: "Email verified successfully! You now have full access to all YoForex features." 
      });
    } catch (error: any) {
      console.error("[EMAIL VERIFICATION] Error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
  
  // Change password endpoint (for authenticated users)
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }
      
      const user = req.user as any;
      
      // Get user with password from database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      if (!dbUser || !dbUser.password) {
        return res.status(400).json({ error: "Cannot change password for this account type" });
      }
      
      // Verify current password
      const isValid = await verifyPassword(currentPassword, dbUser.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      console.error("[LOCAL AUTH] Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
  
  console.log("✅ Local authentication configured");
  if (process.env.ALLOW_REGISTRATION !== "false") {
    console.log("📝 User registration is ENABLED at /api/register");
  }
  console.log("🔑 Password reset is ENABLED at /api/auth/forgot-password and /api/auth/reset-password");
}