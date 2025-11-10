/**
 * ADMIN LOGIC TEST SUITE
 * Tests all admin functionality, moderation, and system controls
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import {
  users,
  adminActions,
  moderationQueue,
  reportedContent,
  systemSettings,
  featureFlags,
  forumThreads,
  forumCategories,
  content,
  supportTickets,
  errorGroups,
  treasurySnapshots,
  ipBans,
} from '../../shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const API_URL = 'http://localhost:3001';
let adminId: string | null = null;
let moderatorId: string | null = null;
let regularUserId: string | null = null;
let adminCookie: string | null = null;
let moderatorCookie: string | null = null;
let userCookie: string | null = null;

describe('Admin Logic Tests', () => {

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('AdminPass123!', 10);

    // Create admin user
    const [admin] = await db.insert(users).values({
      username: `admin_${Date.now()}`,
      email: `admin${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 10000,
      role: 'admin',
      is_email_verified: true,
    }).returning();
    adminId = admin.id;

    // Create moderator user
    const [moderator] = await db.insert(users).values({
      username: `mod_${Date.now()}`,
      email: `mod${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 1000,
      role: 'moderator',
      is_email_verified: true,
    }).returning();
    moderatorId = moderator.id;

    // Create regular user
    const [user] = await db.insert(users).values({
      username: `user_${Date.now()}`,
      email: `user${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 100,
      role: 'user',
      is_email_verified: true,
    }).returning();
    regularUserId = user.id;

    // Login as admin
    const adminLogin = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: admin.email,
        password: 'AdminPass123!',
      }),
    });
    adminCookie = adminLogin.headers.get('set-cookie') || '';

    // Login as moderator
    const modLogin = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: moderator.email,
        password: 'AdminPass123!',
      }),
    });
    moderatorCookie = modLogin.headers.get('set-cookie') || '';

    // Login as regular user
    const userLogin = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'AdminPass123!',
      }),
    });
    userCookie = userLogin.headers.get('set-cookie') || '';
  });

  describe('Moderation Workflow', () => {

    test('Content approval workflow', async () => {
      // User creates content that needs moderation
      const [pendingContent] = await db.insert(content).values({
        title: 'EA Needs Approval',
        description: 'This EA is awaiting moderation',
        authorId: regularUserId!,
        priceCoins: 100,
        category: 'ea',
        status: 'pending',
        slug: `pending-ea-${Date.now()}`,
      }).returning();

      // Add to moderation queue
      await db.insert(moderationQueue).values({
        contentType: 'marketplace_item',
        contentId: pendingContent.id,
        reportedBy: 'system',
        reason: 'New content requires approval',
        status: 'pending',
        priority: 'normal',
      });

      // Moderator reviews content
      const reviewResponse = await fetch(`${API_URL}/api/admin/moderation/review/${pendingContent.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': moderatorCookie,
        },
        body: JSON.stringify({
          action: 'approve',
          notes: 'Content looks good',
        }),
      });

      expect(reviewResponse.ok).toBe(true);

      // Check content status updated
      const [approvedContent] = await db.select().from(content)
        .where(eq(content.id, pendingContent.id))
        .limit(1);

      expect(approvedContent.status).toBe('approved');

      // Check moderation queue updated
      const [modQueue] = await db.select().from(moderationQueue)
        .where(eq(moderationQueue.contentId, pendingContent.id))
        .limit(1);

      expect(modQueue.status).toBe('approved');
      expect(modQueue.moderatorId).toBe(moderatorId);
    });

    test('User ban/unban logic', async () => {
      // Admin bans user
      const banResponse = await fetch(`${API_URL}/api/admin/users/${regularUserId}/ban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          reason: 'Violation of terms',
          duration: 7, // 7 days
        }),
      });

      expect(banResponse.ok).toBe(true);

      // Check user is banned
      const [bannedUser] = await db.select().from(users)
        .where(eq(users.id, regularUserId!))
        .limit(1);

      expect(bannedUser.status).toBe('banned');
      expect(bannedUser.banReason).toContain('Violation');

      // Check admin action logged
      const [adminAction] = await db.select().from(adminActions)
        .where(
          and(
            eq(adminActions.adminId, adminId!),
            eq(adminActions.action, 'ban_user')
          )
        )
        .orderBy(desc(adminActions.createdAt))
        .limit(1);

      expect(adminAction).toBeDefined();
      expect(adminAction.targetUserId).toBe(regularUserId);

      // User tries to login while banned
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: bannedUser.email,
          password: 'AdminPass123!',
        }),
      });

      expect(loginResponse.ok).toBe(false);
      const error = await loginResponse.json();
      expect(error.error.toLowerCase()).toContain('banned');

      // Admin unbans user
      const unbanResponse = await fetch(`${API_URL}/api/admin/users/${regularUserId}/unban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
      });

      expect(unbanResponse.ok).toBe(true);

      // Check user is unbanned
      const [unbannedUser] = await db.select().from(users)
        .where(eq(users.id, regularUserId!))
        .limit(1);

      expect(unbannedUser.status).toBe('active');
    });

    test('Thread lock/unlock', async () => {
      // Create thread
      const [thread] = await db.insert(forumThreads).values({
        title: 'Thread to Lock',
        content: 'This thread will be locked',
        authorId: regularUserId!,
        category: 'general',
        slug: `lock-test-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();

      // Moderator locks thread
      const lockResponse = await fetch(`${API_URL}/api/admin/threads/${thread.id}/lock`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': moderatorCookie,
        },
        body: JSON.stringify({
          reason: 'Discussion got heated',
        }),
      });

      expect(lockResponse.ok).toBe(true);

      // Check thread is locked
      const [lockedThread] = await db.select().from(forumThreads)
        .where(eq(forumThreads.id, thread.id))
        .limit(1);

      expect(lockedThread.isLocked).toBe(true);
      expect(lockedThread.lockReason).toContain('heated');

      // User tries to reply to locked thread
      const replyResponse = await fetch(`${API_URL}/api/forum/threads/${thread.id}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': userCookie,
        },
        body: JSON.stringify({
          content: 'Reply to locked thread',
        }),
      });

      expect(replyResponse.ok).toBe(false);
      const error = await replyResponse.json();
      expect(error.error.toLowerCase()).toContain('locked');

      // Moderator unlocks thread
      const unlockResponse = await fetch(`${API_URL}/api/admin/threads/${thread.id}/unlock`, {
        method: 'POST',
        headers: { 
          'Cookie': moderatorCookie,
        },
      });

      expect(unlockResponse.ok).toBe(true);
    });

    test('Category management', async () => {
      // Admin creates new category
      const createResponse = await fetch(`${API_URL}/api/admin/categories`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          name: 'New Trading Category',
          slug: 'new-trading',
          description: 'Category for new trading discussions',
          sortOrder: 100,
          isVisible: true,
        }),
      });

      expect(createResponse.ok).toBe(true);
      const newCategory = await createResponse.json();

      // Check category created
      const [category] = await db.select().from(forumCategories)
        .where(eq(forumCategories.slug, 'new-trading'))
        .limit(1);

      expect(category).toBeDefined();
      expect(category.name).toBe('New Trading Category');

      // Moderator tries to delete category (should fail - admin only)
      const deleteResponse = await fetch(`${API_URL}/api/admin/categories/${category.id}`, {
        method: 'DELETE',
        headers: { 
          'Cookie': moderatorCookie,
        },
      });

      expect(deleteResponse.ok).toBe(false);
      expect(deleteResponse.status).toBe(403);

      // Admin deletes category
      const adminDeleteResponse = await fetch(`${API_URL}/api/admin/categories/${category.id}`, {
        method: 'DELETE',
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(adminDeleteResponse.ok).toBe(true);
    });

    test('Content rejection with reason', async () => {
      // Create content for moderation
      const [pendingContent] = await db.insert(content).values({
        title: 'Suspicious EA',
        description: 'This EA might be problematic',
        authorId: regularUserId!,
        priceCoins: 1000,
        category: 'ea',
        status: 'pending',
        slug: `suspicious-${Date.now()}`,
      }).returning();

      // Moderator rejects content
      const rejectResponse = await fetch(`${API_URL}/api/admin/moderation/reject/${pendingContent.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': moderatorCookie,
        },
        body: JSON.stringify({
          reason: 'Misleading claims about performance',
          notifyAuthor: true,
        }),
      });

      expect(rejectResponse.ok).toBe(true);

      // Check content rejected
      const [rejectedContent] = await db.select().from(content)
        .where(eq(content.id, pendingContent.id))
        .limit(1);

      expect(rejectedContent.status).toBe('rejected');
      expect(rejectedContent.rejectionReason).toContain('Misleading');
    });
  });

  describe('System Control', () => {

    test('Feature flag toggles', async () => {
      // Create feature flag
      const [flag] = await db.insert(featureFlags).values({
        key: 'new_trading_feature',
        description: 'Enable new trading feature',
        isEnabled: false,
        enabledFor: [],
      }).returning();

      // Admin enables feature flag
      const enableResponse = await fetch(`${API_URL}/api/admin/features/${flag.key}/enable`, {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(enableResponse.ok).toBe(true);

      // Check flag is enabled
      const [enabledFlag] = await db.select().from(featureFlags)
        .where(eq(featureFlags.key, flag.key))
        .limit(1);

      expect(enabledFlag.isEnabled).toBe(true);

      // Test partial rollout
      const partialResponse = await fetch(`${API_URL}/api/admin/features/${flag.key}/partial`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          percentage: 50, // 50% of users
          userGroups: ['beta_testers'],
        }),
      });

      if (partialResponse.ok) {
        const [partialFlag] = await db.select().from(featureFlags)
          .where(eq(featureFlags.key, flag.key))
          .limit(1);

        expect(partialFlag.rolloutPercentage).toBe(50);
        console.log('✓ Feature flag partial rollout working');
      }

      // Regular user checks feature availability
      const checkResponse = await fetch(`${API_URL}/api/features/${flag.key}`, {
        headers: { 
          'Cookie': userCookie,
        },
      });

      if (checkResponse.ok) {
        const { isEnabled } = await checkResponse.json();
        console.log(`✓ Feature flag check for user: ${isEnabled}`);
      }
    });

    test('Bot control', async () => {
      // Admin stops all bots
      const stopResponse = await fetch(`${API_URL}/api/admin/bots/stop-all`, {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(stopResponse.ok).toBe(true);

      // Check bots are deactivated
      const activeBots = await db.select().from('bots' as any)
        .where(eq('isActive' as any, true));

      expect(activeBots.length).toBe(0);

      // Admin starts specific bots
      const startResponse = await fetch(`${API_URL}/api/admin/bots/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          botIds: ['bot-1', 'bot-2'],
        }),
      });

      if (startResponse.ok) {
        console.log('✓ Bot control working');
      }
    });

    test('Treasury management', async () => {
      // Get current treasury balance
      const balanceResponse = await fetch(`${API_URL}/api/admin/treasury/balance`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(balanceResponse.ok).toBe(true);
      const { balance } = await balanceResponse.json();

      // Admin adjusts treasury
      const adjustResponse = await fetch(`${API_URL}/api/admin/treasury/adjust`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          amount: 1000,
          reason: 'Monthly treasury refill',
        }),
      });

      expect(adjustResponse.ok).toBe(true);

      // Check adjustment recorded
      const [snapshot] = await db.select().from(treasurySnapshots)
        .orderBy(desc(treasurySnapshots.createdAt))
        .limit(1);

      if (snapshot) {
        expect(snapshot.totalBalance).toBe(balance + 1000);
        console.log('✓ Treasury management working');
      }
    });

    test('Error monitoring access', async () => {
      // Create error groups for testing
      await db.insert(errorGroups).values({
        fingerprint: 'error-123',
        message: 'Test error',
        firstSeen: new Date(),
        lastSeen: new Date(),
        occurrences: 5,
        status: 'unresolved',
      });

      // Admin accesses error monitoring
      const errorsResponse = await fetch(`${API_URL}/api/admin/errors`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(errorsResponse.ok).toBe(true);
      const errors = await errorsResponse.json();
      expect(errors.length).toBeGreaterThan(0);

      // Regular user cannot access
      const userErrorsResponse = await fetch(`${API_URL}/api/admin/errors`, {
        headers: { 
          'Cookie': userCookie,
        },
      });

      expect(userErrorsResponse.ok).toBe(false);
      expect(userErrorsResponse.status).toBe(403);
    });

    test('System settings management', async () => {
      // Admin updates system settings
      const updateResponse = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          maintenanceMode: true,
          maintenanceMessage: 'System upgrade in progress',
          registrationEnabled: false,
          tradingEnabled: true,
        }),
      });

      expect(updateResponse.ok).toBe(true);

      // Check settings updated
      const settings = await db.select().from(systemSettings);
      const maintenanceSetting = settings.find(s => s.key === 'maintenanceMode');
      
      if (maintenanceSetting) {
        expect(maintenanceSetting.value).toBe('true');
      }

      // Check maintenance mode affects regular users
      const homeResponse = await fetch(`${API_URL}/`, {
        headers: { 
          'Cookie': userCookie,
        },
      });

      if (!homeResponse.ok && homeResponse.status === 503) {
        console.log('✓ Maintenance mode working');
      }
    });
  });

  describe('Admin Analytics and Reporting', () => {

    test('User statistics access', async () => {
      const statsResponse = await fetch(`${API_URL}/api/admin/analytics/users`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(statsResponse.ok).toBe(true);
      const stats = await statsResponse.json();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('newUsersToday');
      expect(stats).toHaveProperty('bannedUsers');
    });

    test('Financial reports', async () => {
      const financeResponse = await fetch(`${API_URL}/api/admin/analytics/finance`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(financeResponse.ok).toBe(true);
      const finance = await financeResponse.json();

      expect(finance).toHaveProperty('totalCoinsInCirculation');
      expect(finance).toHaveProperty('dailyTransactionVolume');
      expect(finance).toHaveProperty('marketplaceRevenue');
    });

    test('Content moderation queue stats', async () => {
      const modStatsResponse = await fetch(`${API_URL}/api/admin/analytics/moderation`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(modStatsResponse.ok).toBe(true);
      const modStats = await modStatsResponse.json();

      expect(modStats).toHaveProperty('pendingItems');
      expect(modStats).toHaveProperty('approvedToday');
      expect(modStats).toHaveProperty('rejectedToday');
      expect(modStats).toHaveProperty('averageReviewTime');
    });
  });

  describe('Security and Access Control', () => {

    test('Admin action audit trail', async () => {
      // Admin performs action
      await fetch(`${API_URL}/api/admin/users/${regularUserId}/adjust-coins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          amount: 500,
          reason: 'Manual adjustment for testing',
        }),
      });

      // Check audit trail
      const auditTrail = await db.select().from(adminActions)
        .where(eq(adminActions.adminId, adminId!))
        .orderBy(desc(adminActions.createdAt))
        .limit(5);

      expect(auditTrail.length).toBeGreaterThan(0);
      const latestAction = auditTrail[0];
      expect(latestAction.action).toContain('coin');
      expect(latestAction.details).toContain('500');
    });

    test('IP ban functionality', async () => {
      const testIp = '192.168.1.100';

      // Admin bans IP
      const banIpResponse = await fetch(`${API_URL}/api/admin/security/ban-ip`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          ipAddress: testIp,
          reason: 'Suspicious activity',
          duration: 24, // 24 hours
        }),
      });

      expect(banIpResponse.ok).toBe(true);

      // Check IP is banned
      const [bannedIp] = await db.select().from(ipBans)
        .where(eq(ipBans.ipAddress, testIp))
        .limit(1);

      expect(bannedIp).toBeDefined();
      expect(bannedIp.reason).toContain('Suspicious');
      expect(bannedIp.expiresAt).toBeDefined();

      // Simulate request from banned IP
      const bannedRequest = await fetch(`${API_URL}/api/public/test`, {
        headers: { 
          'X-Forwarded-For': testIp,
        },
      });

      if (bannedRequest.status === 403) {
        console.log('✓ IP ban enforcement working');
      }
    });

    test('Role hierarchy enforcement', async () => {
      // Moderator tries to modify admin
      const modifyAdminResponse = await fetch(`${API_URL}/api/admin/users/${adminId}/ban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': moderatorCookie,
        },
        body: JSON.stringify({
          reason: 'Moderator trying to ban admin',
        }),
      });

      expect(modifyAdminResponse.ok).toBe(false);
      expect(modifyAdminResponse.status).toBe(403);

      // Regular user tries to access admin endpoints
      const userAdminResponse = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 
          'Cookie': userCookie,
        },
      });

      expect(userAdminResponse.ok).toBe(false);
      expect(userAdminResponse.status).toBe(403);
    });

    test('Sensitive data protection', async () => {
      // Get user list as admin
      const usersResponse = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(usersResponse.ok).toBe(true);
      const users = await usersResponse.json();

      // Check sensitive data is not exposed
      if (users.length > 0) {
        const user = users[0];
        expect(user.password_hash).toBeUndefined();
        expect(user.sessionToken).toBeUndefined();
        
        // Email might be partially masked
        if (user.email && user.email.includes('*')) {
          console.log('✓ Email masking working');
        }
      }
    });
  });

  describe('Cron Job Management', () => {

    test('Manual job execution', async () => {
      // Admin triggers coin expiration job manually
      const jobResponse = await fetch(`${API_URL}/api/admin/jobs/expire-coins/run`, {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(jobResponse.ok).toBe(true);
      const result = await jobResponse.json();
      expect(result).toHaveProperty('coinsExpired');
      expect(result).toHaveProperty('usersAffected');
    });

    test('Job scheduling configuration', async () => {
      // Update job schedule
      const scheduleResponse = await fetch(`${API_URL}/api/admin/jobs/daily-digest/schedule`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
        },
        body: JSON.stringify({
          schedule: '0 9 * * *', // 9 AM daily
          enabled: true,
          timezone: 'America/New_York',
        }),
      });

      if (scheduleResponse.ok) {
        console.log('✓ Job scheduling configuration working');
      }
    });

    test('Job execution history', async () => {
      const historyResponse = await fetch(`${API_URL}/api/admin/jobs/history`, {
        headers: { 
          'Cookie': adminCookie,
        },
      });

      expect(historyResponse.ok).toBe(true);
      const history = await historyResponse.json();

      if (history.length > 0) {
        const job = history[0];
        expect(job).toHaveProperty('jobName');
        expect(job).toHaveProperty('startTime');
        expect(job).toHaveProperty('endTime');
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('result');
      }
    });
  });
});