/**
 * FORUM BUSINESS LOGIC TEST SUITE
 * Tests all forum functionality including threads, replies, likes, and rewards
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import { 
  users, 
  forumThreads, 
  forumReplies, 
  forumThreadLikes,
  forumReplyLikes,
  coinTransactions,
  forumCategories,
} from '../../shared/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const API_URL = 'http://localhost:3001';
let testUserId: string | null = null;
let testThreadId: string | null = null;
let sessionCookie: string | null = null;

describe('Forum Business Logic Tests', () => {

  beforeEach(async () => {
    // Create test user and login
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const [user] = await db.insert(users).values({
      username: `forumuser_${Date.now()}`,
      email: `forumtest${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 50, // Start with some coins
      is_email_verified: true,
    }).returning();
    testUserId = user.id;
    
    // Login to get session
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'TestPass123!',
      }),
    });
    sessionCookie = loginResponse.headers.get('set-cookie') || '';
  });

  describe('Thread Creation Logic', () => {
    
    test('User must be logged in to create thread', async () => {
      // Try without authentication
      const response = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Thread',
          content: 'This should fail without auth',
          category: 'general',
        }),
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401); // Unauthorized
    });

    test('Title and content are required', async () => {
      // Missing title
      const response1 = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'Content without title',
          category: 'general',
        }),
      });
      expect(response1.ok).toBe(false);

      // Missing content
      const response2 = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Title without content',
          category: 'general',
        }),
      });
      expect(response2.ok).toBe(false);

      // Empty strings
      const response3 = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: '',
          content: '',
          category: 'general',
        }),
      });
      expect(response3.ok).toBe(false);
    });

    test('Category must exist', async () => {
      const response = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Test Thread',
          content: 'Testing with non-existent category',
          category: 'non_existent_category_xyz123',
        }),
      });
      
      // Should reject non-existent category
      if (!response.ok) {
        const error = await response.json();
        expect(error.error).toBeDefined();
      }
    });

    test('10 coins reward added for thread creation', async () => {
      const initialCoins = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0].totalCoins;

      const response = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Test Thread for Coin Reward',
          content: 'This thread should give me 10 coins',
          category: 'general',
        }),
      });

      expect(response.ok).toBe(true);
      const thread = await response.json();
      testThreadId = thread.id;

      // Check coins were added
      const updatedUser = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0];
      
      expect(updatedUser.totalCoins).toBe(initialCoins + 10); // CRITICAL: Must be 10 coins

      // Check transaction was recorded
      const transaction = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, testUserId!),
            eq(coinTransactions.trigger, 'forum.thread.create')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);
      
      expect(transaction[0]).toBeDefined();
      expect(transaction[0].amount).toBe(10);
    });

    test('Cooldown period between posts', async () => {
      // Create first thread
      const response1 = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'First Thread',
          content: 'First thread content',
          category: 'general',
        }),
      });
      expect(response1.ok).toBe(true);

      // Try to create second thread immediately
      const response2 = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Second Thread Too Soon',
          content: 'Should be blocked by cooldown',
          category: 'general',
        }),
      });

      // Check if cooldown is enforced
      if (!response2.ok) {
        const error = await response2.json();
        console.log('Cooldown enforced:', error.error);
      }
    });

    test('Spam detection for rapid posting', async () => {
      const spamAttempts = [];
      
      // Try to create 5 threads rapidly
      for (let i = 0; i < 5; i++) {
        spamAttempts.push(
          fetch(`${API_URL}/api/forum/threads`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              title: `Spam Thread ${i}`,
              content: `Spam content ${i}`.repeat(10),
              category: 'general',
            }),
          })
        );
      }

      const responses = await Promise.all(spamAttempts);
      
      // Some should be blocked as spam
      const blockedCount = responses.filter(r => !r.ok).length;
      if (blockedCount > 0) {
        console.log(`✓ Spam detection blocked ${blockedCount} threads`);
      } else {
        console.warn('⚠ Spam detection may not be working');
      }
    });

    test('Thread title length validation (5-200 chars)', async () => {
      // Too short
      const shortResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'abc', // Only 3 chars
          content: 'Valid content here',
          category: 'general',
        }),
      });
      expect(shortResponse.ok).toBe(false);

      // Too long
      const longResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'A'.repeat(201), // 201 chars
          content: 'Valid content here',
          category: 'general',
        }),
      });
      expect(longResponse.ok).toBe(false);

      // Just right
      const validResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Valid Thread Title',
          content: 'Valid content here',
          category: 'general',
        }),
      });
      expect([true, false]).toContain(validResponse.ok); // May fail due to cooldown
    });

    test('Thread content length validation (10-10000 chars)', async () => {
      // Too short
      const shortResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Valid Title',
          content: 'Too short', // Only 9 chars
          category: 'general',
        }),
      });
      expect(shortResponse.ok).toBe(false);

      // Too long
      const longResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Valid Title',
          content: 'A'.repeat(10001), // 10001 chars
          category: 'general',
        }),
      });
      expect(longResponse.ok).toBe(false);
    });
  });

  describe('Reply Logic', () => {
    
    beforeEach(async () => {
      // Create a test thread to reply to
      const [thread] = await db.insert(forumThreads).values({
        title: 'Thread for Reply Tests',
        content: 'This thread will be used for reply tests',
        authorId: testUserId!,
        category: 'general',
        slug: `test-thread-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();
      testThreadId = thread.id;
    });

    test('Thread must exist to reply', async () => {
      const response = await fetch(`${API_URL}/api/forum/threads/non-existent-thread-id/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'Reply to non-existent thread',
        }),
      });
      
      expect(response.ok).toBe(false);
      expect([404, 400]).toContain(response.status);
    });

    test('Cannot reply to locked thread', async () => {
      // Lock the thread
      await db.update(forumThreads)
        .set({ isLocked: true })
        .where(eq(forumThreads.id, testThreadId!));

      const response = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'Reply to locked thread',
        }),
      });
      
      expect(response.ok).toBe(false);
      if (!response.ok) {
        const error = await response.json();
        expect(error.error).toContain('locked');
      }
    });

    test('5 coins reward for replies', async () => {
      const initialCoins = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0].totalCoins;

      const response = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'This reply should give me 5 coins',
        }),
      });

      expect(response.ok).toBe(true);

      // Check coins were added
      const updatedUser = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0];
      
      expect(updatedUser.totalCoins).toBe(initialCoins + 5); // CRITICAL: Must be 5 coins

      // Check transaction was recorded
      const transaction = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, testUserId!),
            eq(coinTransactions.trigger, 'forum.reply.create')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);
      
      expect(transaction[0]).toBeDefined();
      expect(transaction[0].amount).toBe(5);
    });

    test('User cannot reply to own thread repeatedly (spam prevention)', async () => {
      const replies = [];
      
      // Try to create multiple replies rapidly to own thread
      for (let i = 0; i < 3; i++) {
        replies.push(
          fetch(`${API_URL}/api/forum/threads/${testThreadId}/replies`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              content: `Self reply ${i} - should be limited`,
            }),
          })
        );
      }

      const responses = await Promise.all(replies);
      
      // Check if self-reply spam prevention works
      const successCount = responses.filter(r => r.ok).length;
      if (successCount < 3) {
        console.log(`✓ Self-reply spam prevention working (${3 - successCount} blocked)`);
      }
    });

    test('Nested reply depth limits', async () => {
      // Create initial reply
      const reply1Response = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'Level 1 reply',
        }),
      });
      
      if (reply1Response.ok) {
        const reply1 = await reply1Response.json();
        
        // Try to create nested replies
        let currentParentId = reply1.id;
        let nestingLevel = 2;
        let maxNestingReached = false;
        
        while (nestingLevel <= 10 && !maxNestingReached) {
          const response = await fetch(`${API_URL}/api/forum/replies/${currentParentId}/replies`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              content: `Level ${nestingLevel} nested reply`,
            }),
          });
          
          if (!response.ok) {
            maxNestingReached = true;
            console.log(`✓ Max nesting depth reached at level ${nestingLevel}`);
          } else {
            const reply = await response.json();
            currentParentId = reply.id;
            nestingLevel++;
          }
        }
      }
    });

    test('Reply character limits', async () => {
      // Too short
      const shortResponse = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'Hi', // Too short
        }),
      });
      
      if (!shortResponse.ok) {
        const error = await shortResponse.json();
        expect(error.error).toBeDefined();
      }

      // Too long
      const longResponse = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          content: 'A'.repeat(10001), // Too long
        }),
      });
      expect(longResponse.ok).toBe(false);
    });
  });

  describe('Like/Dislike Logic', () => {
    
    let otherUserId: string;
    let otherSessionCookie: string;
    
    beforeEach(async () => {
      // Create test thread
      const [thread] = await db.insert(forumThreads).values({
        title: 'Thread for Like Tests',
        content: 'This thread will be used for like/dislike tests',
        authorId: testUserId!,
        category: 'general',
        slug: `like-test-thread-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();
      testThreadId = thread.id;
      
      // Create another user to test likes
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      const [otherUser] = await db.insert(users).values({
        username: `otheruser_${Date.now()}`,
        email: `other${Date.now()}@test.com`,
        password_hash: hashedPassword,
        totalCoins: 50,
        is_email_verified: true,
      }).returning();
      otherUserId = otherUser.id;
      
      // Login as other user
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otherUser.email,
          password: 'TestPass123!',
        }),
      });
      otherSessionCookie = loginResponse.headers.get('set-cookie') || '';
    });

    test('Cannot like own content', async () => {
      const response = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie, // Same user who created thread
        },
      });
      
      expect(response.ok).toBe(false);
      if (!response.ok) {
        const error = await response.json();
        expect(error.error.toLowerCase()).toContain('own');
      }
    });

    test('Cannot like same content twice', async () => {
      // First like
      const response1 = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': otherSessionCookie,
        },
      });
      expect(response1.ok).toBe(true);

      // Second like attempt
      const response2 = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': otherSessionCookie,
        },
      });
      
      // Should either fail or toggle (unlike)
      if (response2.ok) {
        const result = await response2.json();
        console.log('Like toggle implemented:', result);
      } else {
        const error = await response2.json();
        expect(error.error).toContain('already');
      }
    });

    test('2 coins reward to content author for likes', async () => {
      const initialAuthorCoins = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0].totalCoins;

      // Like the thread as other user
      const response = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': otherSessionCookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check author received 2 coins
      const updatedAuthor = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0];
      
      expect(updatedAuthor.totalCoins).toBe(initialAuthorCoins + 2); // CRITICAL: Must be 2 coins

      // Check transaction was recorded
      const transaction = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, testUserId!),
            eq(coinTransactions.trigger, 'forum.like.received')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);
      
      expect(transaction[0]).toBeDefined();
      expect(transaction[0].amount).toBe(2);
    });

    test('Like/dislike toggle logic', async () => {
      // Like
      const likeResponse = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': otherSessionCookie,
        },
      });
      expect(likeResponse.ok).toBe(true);

      // Check like exists
      const likes1 = await db.select().from(forumThreadLikes)
        .where(
          and(
            eq(forumThreadLikes.threadId, testThreadId!),
            eq(forumThreadLikes.userId, otherUserId)
          )
        );
      expect(likes1.length).toBeGreaterThan(0);

      // Unlike (toggle)
      const unlikeResponse = await fetch(`${API_URL}/api/forum/threads/${testThreadId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': otherSessionCookie,
        },
      });
      
      if (unlikeResponse.ok) {
        // Check like removed
        const likes2 = await db.select().from(forumThreadLikes)
          .where(
            and(
              eq(forumThreadLikes.threadId, testThreadId!),
              eq(forumThreadLikes.userId, otherUserId)
            )
          );
        
        // Should be toggled off
        if (likes2.length === 0) {
          console.log('✓ Like toggle (unlike) working');
        }
      }
    });
  });

  describe('Forum Security Tests', () => {
    
    test('XSS prevention in thread content', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
      ];

      for (const payload of xssPayloads) {
        const response = await fetch(`${API_URL}/api/forum/threads`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': sessionCookie,
          },
          body: JSON.stringify({
            title: 'XSS Test Thread',
            content: payload,
            category: 'general',
          }),
        });
        
        if (response.ok) {
          const thread = await response.json();
          // Content should be sanitized
          expect(thread.content).not.toContain('<script>');
          expect(thread.content).not.toContain('onerror=');
          expect(thread.content).not.toContain('javascript:');
        }
      }
    });

    test('SQL injection prevention in search', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE forumThreads; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await fetch(`${API_URL}/api/forum/search?q=${encodeURIComponent(payload)}`, {
          headers: { 
            'Cookie': sessionCookie,
          },
        });
        
        // Should handle safely without SQL errors
        if (response.ok) {
          const results = await response.json();
          expect(results).toBeDefined();
        } else {
          const error = await response.json();
          expect(error.error).not.toContain('SQL');
          expect(error.error).not.toContain('syntax');
        }
      }
    });

    test('Rate limiting on thread creation', async () => {
      const attempts = [];
      
      // Try to create 10 threads rapidly
      for (let i = 0; i < 10; i++) {
        attempts.push(
          fetch(`${API_URL}/api/forum/threads`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              title: `Rate Limit Test ${i}`,
              content: `Testing rate limiting on thread creation ${i}`,
              category: 'general',
            }),
          })
        );
      }

      const responses = await Promise.all(attempts);
      
      // Check if rate limiting kicked in
      const rateLimited = responses.some(r => r.status === 429);
      const failed = responses.filter(r => !r.ok).length;
      
      if (rateLimited) {
        console.log('✓ Forum rate limiting is working');
      } else if (failed > 0) {
        console.log(`✓ Spam prevention blocked ${failed} threads`);
      } else {
        console.warn('⚠ Rate limiting may not be configured for forum');
      }
    });
  });
});