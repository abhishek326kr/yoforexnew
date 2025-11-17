import type { Express, Request, Response } from "express";
import { isAdminMiddleware } from "../middleware/adminAuth.js";
import { db } from "../db.js";
import { users, userMilestones } from "../../shared/schema.js";
import { eq, and, sql, desc, inArray, gte, lte } from "drizzle-orm";
import { validateTwoFactor, generateTwoFactorSecret, enableTwoFactor, disableTwoFactor } from "../services/twoFactorService.js";

// Optimized admin routes with caching and better query performance
export function setupOptimizedAdminRoutes(app: Express) {
  // Cache for frequently accessed data
  const adminCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 60000; // 1 minute

  // Helper to get cached data
  function getCached(key: string): any | null {
    const cached = adminCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    adminCache.delete(key);
    return null;
  }

  // Helper to set cached data
  function setCache(key: string, data: any) {
    adminCache.set(key, { data, timestamp: Date.now() });
  }

  // Optimized /api/me endpoint with caching
  app.get("/api/me", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ error: "Invalid session" });
      }

      // Check cache first
      const cacheKey = `user:${user.id}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Fetch user data with minimal fields for performance
      const [userData] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          twoFactorEnabled: users.twoFactorEnabled,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!userData) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cache the result
      setCache(cacheKey, userData);
      res.json(userData);
    } catch (error) {
      console.error("[API] /me error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Two-Factor Authentication endpoints
  app.post("/api/auth/2fa/generate", isAdminMiddleware, async (req, res) => {
    try {
      const user = req.user as any;
      const result = await generateTwoFactorSecret(user.id, user.username);
      res.json(result);
    } catch (error) {
      console.error("[2FA] Generate error:", error);
      res.status(500).json({ error: "Failed to generate 2FA secret" });
    }
  });

  app.post("/api/auth/2fa/enable", isAdminMiddleware, async (req, res) => {
    try {
      const user = req.user as any;
      const { secret, code } = req.body;
      
      const success = await enableTwoFactor(user.id, secret, code);
      if (!success) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      res.json({ success: true, message: "2FA enabled successfully" });
    } catch (error) {
      console.error("[2FA] Enable error:", error);
      res.status(500).json({ error: "Failed to enable 2FA" });
    }
  });

  app.post("/api/auth/2fa/disable", isAdminMiddleware, async (req, res) => {
    try {
      const user = req.user as any;
      await disableTwoFactor(user.id);
      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error) {
      console.error("[2FA] Disable error:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });

  app.get("/api/auth/2fa/status", async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.json({ enabled: false });
      }
      
      const user = req.user as any;
      const [userData] = await db
        .select({ twoFactorEnabled: users.twoFactorEnabled })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      res.json({ enabled: userData?.twoFactorEnabled || false });
    } catch (error) {
      console.error("[2FA] Status error:", error);
      res.status(500).json({ error: "Failed to get 2FA status" });
    }
  });

  // Bulk user operations
  app.post("/api/admin/users/bulk/ban", isAdminMiddleware, async (req, res) => {
    try {
      const { userIds, reason } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "No users selected" });
      }
      
      await db
        .update(users)
        .set({
          status: "banned",
          bannedAt: new Date(),
          banReason: reason || "Bulk ban by admin",
          bannedBy: (req.user as any).id,
        })
        .where(inArray(users.id, userIds));
      
      res.json({ success: true, affectedUsers: userIds.length });
    } catch (error) {
      console.error("[BULK] Ban error:", error);
      res.status(500).json({ error: "Failed to ban users" });
    }
  });

  app.post("/api/admin/users/bulk/activate", isAdminMiddleware, async (req, res) => {
    try {
      const { userIds } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "No users selected" });
      }
      
      await db
        .update(users)
        .set({
          status: "active",
          bannedAt: null,
          banReason: null,
          bannedBy: null,
          suspendedUntil: null,
        })
        .where(inArray(users.id, userIds));
      
      res.json({ success: true, affectedUsers: userIds.length });
    } catch (error) {
      console.error("[BULK] Activate error:", error);
      res.status(500).json({ error: "Failed to activate users" });
    }
  });

  app.post("/api/admin/users/bulk/role", isAdminMiddleware, async (req, res) => {
    try {
      const { userIds, role } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "No users selected" });
      }
      
      if (!["member", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      await db
        .update(users)
        .set({ role })
        .where(inArray(users.id, userIds));
      
      res.json({ success: true, affectedUsers: userIds.length });
    } catch (error) {
      console.error("[BULK] Role change error:", error);
      res.status(500).json({ error: "Failed to change user roles" });
    }
  });

  app.post("/api/admin/users/bulk/export", isAdminMiddleware, async (req, res) => {
    try {
      const { userIds, format = "csv" } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "No users selected" });
      }
      
      const userData = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          status: users.status,
          totalCoins: users.totalCoins,
          level: users.level,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(inArray(users.id, userIds));
      
      if (format === "csv") {
        const csv = [
          "ID,Username,Email,Role,Status,Coins,Level,Created",
          ...userData.map(u => 
            `"${u.id}","${u.username}","${u.email || ''}","${u.role}","${u.status}","${u.totalCoins}","${u.level}","${u.createdAt}"`
          )
        ].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=users-export.csv");
        res.send(csv);
      } else {
        res.json(userData);
      }
    } catch (error) {
      console.error("[BULK] Export error:", error);
      res.status(500).json({ error: "Failed to export users" });
    }
  });

  // Optimized analytics endpoint with caching
  app.get("/api/admin/analytics/users", isAdminMiddleware, async (req, res) => {
    try {
      const cacheKey = "analytics:users";
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Run optimized queries in parallel
      const [dauResult, mauResult, newUsersResult, growthData] = await Promise.all([
        // DAU - Daily Active Users (last 24 hours)
        db
          .select({ count: sql`count(distinct ${users.id})` })
          .from(users)
          .where(gte(users.lastActive, new Date(Date.now() - 24 * 60 * 60 * 1000))),
        
        // MAU - Monthly Active Users (last 30 days)
        db
          .select({ count: sql`count(distinct ${users.id})` })
          .from(users)
          .where(gte(users.lastActive, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
        
        // New users (last 7 days)
        db
          .select({ count: sql`count(*)` })
          .from(users)
          .where(gte(users.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
        
        // Growth data (last 30 days)
        db
          .select({
            date: sql`date_trunc('day', ${users.createdAt})`,
            count: sql`count(*)`,
          })
          .from(users)
          .where(gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
          .groupBy(sql`date_trunc('day', ${users.createdAt})`)
          .orderBy(sql`date_trunc('day', ${users.createdAt})`),
      ]);

      const data = {
        dau: Number(dauResult[0]?.count || 0),
        mau: Number(mauResult[0]?.count || 0),
        newUsers: Number(newUsersResult[0]?.count || 0),
        churnRate: 0, // Calculate based on your business logic
        growthData: growthData.map(d => ({
          date: d.date,
          users: Number(d.count),
        })),
        countryData: [], // Add if needed
        activeInactiveData: [], // Add if needed
      };

      // Cache the result
      setCache(cacheKey, data);
      res.json(data);
    } catch (error) {
      console.error("[ANALYTICS] Users error:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  // Clear cache periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of adminCache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        adminCache.delete(key);
      }
    }
  }, CACHE_TTL * 2);
}