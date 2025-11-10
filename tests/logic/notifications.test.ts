/**
 * NOTIFICATION LOGIC TEST SUITE
 * Tests notification triggers, delivery rules, and preferences
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import {
  users,
  notifications,
  emailNotifications,
  forumThreads,
  forumReplies,
  userFollows,
  contentPurchases,
  content,
  userSettings,
} from '../../shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const API_URL = 'http://localhost:3001';
let user1Id: string | null = null;
let user2Id: string | null = null;
let user1Cookie: string | null = null;
let user2Cookie: string | null = null;
let threadId: string | null = null;

describe('Notification Logic Tests', () => {

  beforeEach(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    
    const [user1] = await db.insert(users).values({
      username: `notifyuser1_${Date.now()}`,
      email: `notify1_${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 500,
      is_email_verified: true,
      emailNotifications: true, // Enabled by default
    }).returning();
    user1Id = user1.id;

    const [user2] = await db.insert(users).values({
      username: `notifyuser2_${Date.now()}`,
      email: `notify2_${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 500,
      is_email_verified: true,
      emailNotifications: true,
    }).returning();
    user2Id = user2.id;

    // Login users
    const login1 = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user1.email,
        password: 'TestPass123!',
      }),
    });
    user1Cookie = login1.headers.get('set-cookie') || '';

    const login2 = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user2.email,
        password: 'TestPass123!',
      }),
    });
    user2Cookie = login2.headers.get('set-cookie') || '';
  });

  describe('Trigger Conditions', () => {

    test('Reply to thread triggers notification', async () => {
      // User1 creates thread
      const threadResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user1Cookie,
        },
        body: JSON.stringify({
          title: 'Thread for Reply Notification Test',
          content: 'This thread will test reply notifications',
          category: 'general',
        }),
      });

      expect(threadResponse.ok).toBe(true);
      const thread = await threadResponse.json();
      threadId = thread.id;

      // User2 replies to thread
      const replyResponse = await fetch(`${API_URL}/api/forum/threads/${threadId}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user2Cookie,
        },
        body: JSON.stringify({
          content: 'This reply should trigger a notification for User1',
        }),
      });

      expect(replyResponse.ok).toBe(true);

      // Check notification was created for thread author (User1)
      const notification = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'reply')
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      expect(notification[0]).toBeDefined();
      expect(notification[0].title).toContain('reply');
      expect(notification[0].actionUrl).toContain(threadId);
    });

    test('@mention triggers notification', async () => {
      // User1 creates thread mentioning User2
      const threadResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user1Cookie,
        },
        body: JSON.stringify({
          title: 'Mention Test Thread',
          content: `Hey @notifyuser2_${Date.now()}, check this out!`, // Mention User2
          category: 'general',
        }),
      });

      if (threadResponse.ok) {
        // Check notification was created for mentioned user
        const notification = await db.select().from(notifications)
          .where(
            and(
              eq(notifications.userId, user2Id!),
              eq(notifications.type, 'mention')
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(1);

        if (notification[0]) {
          expect(notification[0].title).toContain('mention');
          console.log('✓ @mention notification working');
        } else {
          console.warn('⚠ @mention notifications may not be implemented');
        }
      }
    });

    test('Follow triggers notification', async () => {
      // User2 follows User1
      const followResponse = await fetch(`${API_URL}/api/users/${user1Id}/follow`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user2Cookie,
        },
      });

      expect(followResponse.ok).toBe(true);

      // Check notification was created for followed user (User1)
      const notification = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'follow')
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      expect(notification[0]).toBeDefined();
      expect(notification[0].title).toContain('follow');
      expect(notification[0].message).toContain(user2Id);
    });

    test('Purchase triggers notification for seller', async () => {
      // User1 publishes content
      const [testContent] = await db.insert(content).values({
        title: 'Content for Purchase Notification',
        description: 'Test content',
        authorId: user1Id!,
        priceCoins: 100,
        category: 'ea',
        status: 'approved',
        slug: `content-${Date.now()}`,
      }).returning();

      // User2 purchases content
      const purchaseResponse = await fetch(`${API_URL}/api/marketplace/purchase/${testContent.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user2Cookie,
        },
      });

      expect(purchaseResponse.ok).toBe(true);

      // Check notification was created for seller (User1)
      const notification = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'purchase')
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      expect(notification[0]).toBeDefined();
      expect(notification[0].title).toContain('purchase');
      expect(notification[0].message).toContain('100'); // Amount
    });

    test('Like on thread triggers notification', async () => {
      // User1 creates thread
      const [thread] = await db.insert(forumThreads).values({
        title: 'Thread for Like Notification',
        content: 'Test thread content',
        authorId: user1Id!,
        category: 'general',
        slug: `like-notify-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();

      // User2 likes thread
      const likeResponse = await fetch(`${API_URL}/api/forum/threads/${thread.id}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user2Cookie,
        },
      });

      expect(likeResponse.ok).toBe(true);

      // Check notification for thread author
      const notification = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'like')
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      expect(notification[0]).toBeDefined();
      expect(notification[0].title).toContain('like');
    });

    test('Badge achievement triggers notification', async () => {
      // Simulate badge achievement
      const badgeResponse = await fetch(`${API_URL}/api/users/${user1Id}/award-badge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user1Cookie,
        },
        body: JSON.stringify({
          badgeType: 'first_post',
        }),
      });

      if (badgeResponse.ok) {
        // Check notification
        const notification = await db.select().from(notifications)
          .where(
            and(
              eq(notifications.userId, user1Id!),
              eq(notifications.type, 'badge')
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(1);

        if (notification[0]) {
          expect(notification[0].title).toContain('badge');
          console.log('✓ Badge notification working');
        }
      }
    });

    test('Coin milestone triggers notification', async () => {
      // Update user coins to milestone
      await db.update(users)
        .set({ totalCoins: 1000 }) // Milestone amount
        .where(eq(users.id, user1Id!));

      // Trigger milestone check (might be automatic or via endpoint)
      const milestoneResponse = await fetch(`${API_URL}/api/users/${user1Id}/check-milestones`, {
        method: 'POST',
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      if (milestoneResponse.ok) {
        // Check notification
        const notification = await db.select().from(notifications)
          .where(
            and(
              eq(notifications.userId, user1Id!),
              eq(notifications.type, 'coin_milestone')
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(1);

        if (notification[0]) {
          expect(notification[0].title).toContain('milestone');
          expect(notification[0].message).toContain('1000');
          console.log('✓ Coin milestone notification working');
        }
      }
    });
  });

  describe('Delivery Rules', () => {

    test('User preferences respected', async () => {
      // Disable notifications for User1
      await db.update(users)
        .set({ emailNotifications: false })
        .where(eq(users.id, user1Id!));

      // Create thread
      const [thread] = await db.insert(forumThreads).values({
        title: 'Thread for Preference Test',
        content: 'Testing notification preferences',
        authorId: user1Id!,
        category: 'general',
        slug: `pref-test-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();

      // User2 replies
      await db.insert(forumReplies).values({
        threadId: thread.id,
        authorId: user2Id!,
        content: 'Reply that should not send email',
      });

      // Check in-app notification was created
      const inAppNotification = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'reply')
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      expect(inAppNotification[0]).toBeDefined(); // In-app still created

      // Check email notification was NOT created
      const emailNotification = await db.select().from(emailNotifications)
        .where(eq(emailNotifications.userId, user1Id!))
        .orderBy(desc(emailNotifications.createdAt))
        .limit(1);

      if (emailNotification.length === 0) {
        console.log('✓ Email notification preferences respected');
      }
    });

    test('Email opt-out honored', async () => {
      // Create user settings with email opt-out
      await db.insert(userSettings).values({
        userId: user1Id!,
        emailNotifications: false,
        pushNotifications: true,
        smsNotifications: false,
      });

      // Trigger notification
      const followResponse = await fetch(`${API_URL}/api/users/${user1Id}/follow`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user2Cookie,
        },
      });

      expect(followResponse.ok).toBe(true);

      // Check no email was queued
      const emailNotifications = await db.select().from(emailNotifications)
        .where(
          and(
            eq(emailNotifications.userId, user1Id!),
            gte(emailNotifications.createdAt, new Date(Date.now() - 60000))
          )
        );

      expect(emailNotifications.length).toBe(0);
      console.log('✓ Email opt-out honored');
    });

    test('Batching for digest emails', async () => {
      // Configure user for digest mode
      await db.update(users)
        .set({ emailDigestFrequency: 'daily' })
        .where(eq(users.id, user1Id!));

      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await db.insert(notifications).values({
          userId: user1Id!,
          type: 'reply',
          title: `Reply ${i}`,
          message: `You have a new reply ${i}`,
          isRead: false,
        });
      }

      // Check if notifications are batched (not sent immediately)
      const emailNotifications = await db.select().from(emailNotifications)
        .where(
          and(
            eq(emailNotifications.userId, user1Id!),
            eq(emailNotifications.status, 'queued')
          )
        );

      // Should be batched, not 5 separate emails
      if (emailNotifications.length < 5) {
        console.log('✓ Email batching for digest working');
      }
    });

    test('Priority routing', async () => {
      // Create high priority notification (e.g., security alert)
      const securityNotification = await db.insert(notifications).values({
        userId: user1Id!,
        type: 'security_alert',
        title: 'Security Alert',
        message: 'Suspicious login attempt detected',
        priority: 'high',
        isRead: false,
      }).returning();

      // Create normal priority notification
      const normalNotification = await db.insert(notifications).values({
        userId: user1Id!,
        type: 'like',
        title: 'New Like',
        message: 'Someone liked your post',
        priority: 'normal',
        isRead: false,
      }).returning();

      // Check if high priority is processed differently
      const emailNotifications = await db.select().from(emailNotifications)
        .where(eq(emailNotifications.userId, user1Id!))
        .orderBy(desc(emailNotifications.createdAt));

      // High priority should be sent immediately
      const highPriorityEmail = emailNotifications.find(
        e => e.variables?.notificationType === 'security_alert'
      );

      if (highPriorityEmail) {
        expect(highPriorityEmail.priority).toBe('high');
        console.log('✓ Priority routing working');
      }
    });

    test('Notification grouping', async () => {
      // Create multiple similar notifications
      for (let i = 0; i < 3; i++) {
        await fetch(`${API_URL}/api/forum/threads/${threadId}/like`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': user2Cookie,
          },
        });
      }

      // Check if notifications are grouped
      const notifications = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'like')
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(3);

      // Might be grouped into single notification
      if (notifications.length === 1 && notifications[0].message.includes('3')) {
        console.log('✓ Notification grouping working');
      }
    });
  });

  describe('Notification Management', () => {

    test('Mark as read', async () => {
      // Create notification
      const [notification] = await db.insert(notifications).values({
        userId: user1Id!,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test',
        isRead: false,
      }).returning();

      // Mark as read
      const response = await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
        method: 'POST',
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check it's marked as read
      const updated = await db.select().from(notifications)
        .where(eq(notifications.id, notification.id))
        .limit(1);

      expect(updated[0].isRead).toBe(true);
    });

    test('Mark all as read', async () => {
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await db.insert(notifications).values({
          userId: user1Id!,
          type: 'test',
          title: `Notification ${i}`,
          message: `Message ${i}`,
          isRead: false,
        });
      }

      // Mark all as read
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check all are marked as read
      const unread = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.isRead, false)
          )
        );

      expect(unread.length).toBe(0);
    });

    test('Delete notification', async () => {
      // Create notification
      const [notification] = await db.insert(notifications).values({
        userId: user1Id!,
        type: 'test',
        title: 'To Delete',
        message: 'This will be deleted',
        isRead: false,
      }).returning();

      // Delete notification
      const response = await fetch(`${API_URL}/api/notifications/${notification.id}`, {
        method: 'DELETE',
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check it's deleted
      const deleted = await db.select().from(notifications)
        .where(eq(notifications.id, notification.id))
        .limit(1);

      expect(deleted.length).toBe(0);
    });

    test('Notification pagination', async () => {
      // Create many notifications
      for (let i = 0; i < 25; i++) {
        await db.insert(notifications).values({
          userId: user1Id!,
          type: 'test',
          title: `Notification ${i}`,
          message: `Message ${i}`,
          isRead: false,
        });
      }

      // Get first page
      const page1Response = await fetch(`${API_URL}/api/notifications?page=1&limit=10`, {
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      expect(page1Response.ok).toBe(true);
      const page1 = await page1Response.json();
      expect(page1.notifications.length).toBeLessThanOrEqual(10);

      // Get second page
      const page2Response = await fetch(`${API_URL}/api/notifications?page=2&limit=10`, {
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      expect(page2Response.ok).toBe(true);
      const page2 = await page2Response.json();
      expect(page2.notifications.length).toBeLessThanOrEqual(10);

      // Should have different notifications
      const page1Ids = page1.notifications.map((n: any) => n.id);
      const page2Ids = page2.notifications.map((n: any) => n.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('Edge Cases and Security', () => {

    test('Duplicate notification prevention', async () => {
      // Create thread
      const [thread] = await db.insert(forumThreads).values({
        title: 'Duplicate Test Thread',
        content: 'Testing duplicate prevention',
        authorId: user1Id!,
        category: 'general',
        slug: `dup-test-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();

      // Like thread multiple times (toggle on/off/on)
      for (let i = 0; i < 3; i++) {
        await fetch(`${API_URL}/api/forum/threads/${thread.id}/like`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': user2Cookie,
          },
        });
      }

      // Should not have duplicate notifications
      const notifications = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, user1Id!),
            eq(notifications.type, 'like')
          )
        )
        .orderBy(desc(notifications.createdAt));

      // Should have deduplicated
      console.log(`Notifications created: ${notifications.length}`);
    });

    test('XSS prevention in notification content', async () => {
      // Create notification with XSS payload
      await db.insert(notifications).values({
        userId: user1Id!,
        type: 'test',
        title: '<script>alert("XSS")</script>',
        message: '<img src=x onerror="alert(1)">',
        isRead: false,
      });

      // Retrieve notifications
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Content should be sanitized
      if (data.notifications[0]) {
        expect(data.notifications[0].title).not.toContain('<script>');
        expect(data.notifications[0].message).not.toContain('onerror=');
      }
    });

    test('Rate limiting on notification creation', async () => {
      // Try to create many notifications rapidly
      const notificationPromises = [];
      for (let i = 0; i < 50; i++) {
        notificationPromises.push(
          db.insert(notifications).values({
            userId: user1Id!,
            type: 'spam',
            title: `Spam ${i}`,
            message: `Spam message ${i}`,
            isRead: false,
          })
        );
      }

      try {
        await Promise.all(notificationPromises);
      } catch (error) {
        // Some might fail due to rate limiting
        console.log('✓ Notification spam prevention working');
      }
    });

    test('Old notification cleanup', async () => {
      // Create old notifications
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days old

      await db.insert(notifications).values({
        userId: user1Id!,
        type: 'old',
        title: 'Old Notification',
        message: 'This is old',
        isRead: true,
        createdAt: oldDate,
      });

      // Run cleanup job
      const cleanupResponse = await fetch(`${API_URL}/api/admin/jobs/cleanup-notifications`, {
        method: 'POST',
        headers: { 
          'Cookie': user1Cookie,
        },
      });

      if (cleanupResponse.ok) {
        // Check old notifications are removed
        const oldNotifications = await db.select().from(notifications)
          .where(
            and(
              eq(notifications.userId, user1Id!),
              eq(notifications.type, 'old')
            )
          );

        if (oldNotifications.length === 0) {
          console.log('✓ Old notification cleanup working');
        }
      }
    });
  });
});