import type { Request, Response, NextFunction } from 'express';
import { users } from '../../shared/schema.js';
import { db } from '../db.js';
import { eq } from 'drizzle-orm';

// Cache admin status for better performance
const adminCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Helper function to check if user is admin with caching
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Check cache first
    const cached = adminCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.role === 'admin' || cached.role === 'moderator' || cached.role === 'superadmin';
    }
    
    // Query database
    const [user] = await db.select({
      role: users.role
    }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      adminCache.delete(userId);
      return false;
    }
    
    // Update cache
    adminCache.set(userId, { role: user.role, timestamp: Date.now() });
    
    return user.role === 'admin' || user.role === 'moderator' || user.role === 'superadmin';
  } catch (error) {
    console.error('[AdminAuth] Error checking admin status:', error);
    return false;
  }
}

// Middleware to check if user is admin
export const isAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as any;
    if (!user?.id) {
      return res.status(401).json({ error: "Invalid session" });
    }
    
    // Use cached admin check for performance
    const isAdminUser = await isAdmin(user.id);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: "Insufficient permissions. Admins only." });
    }
    
    next();
  } catch (error) {
    console.error('[AdminAuth] Middleware error:', error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

// Middleware for moderator or admin
export const isModOrAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as any;
    if (!user?.id) {
      return res.status(401).json({ error: "Invalid session" });
    }
    
    // Use cached admin check for performance
    const isAdminOrMod = await isAdmin(user.id);
    
    if (!isAdminOrMod) {
      return res.status(403).json({ error: "Insufficient permissions. Moderators or admins only." });
    }
    
    next();
  } catch (error) {
    console.error('[AdminAuth] Middleware error:', error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

// Clear cache periodically to prevent memory issues
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of adminCache.entries()) {
    if (now - data.timestamp > CACHE_TTL * 2) {
      adminCache.delete(userId);
    }
  }
}, CACHE_TTL * 2);