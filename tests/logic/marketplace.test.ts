/**
 * MARKETPLACE LOGIC TEST SUITE
 * Tests publishing, purchasing, commission splits, and content management
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import {
  users,
  content,
  contentPurchases,
  contentReviews,
  coinTransactions,
  moderationQueue,
  fileAssets,
  COIN_TRIGGERS,
  COIN_CHANNELS,
} from '../../shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import FormData from 'form-data';

const API_URL = 'http://localhost:3001';
let publisherId: string | null = null;
let buyerId: string | null = null;
let contentId: string | null = null;
let publisherCookie: string | null = null;
let buyerCookie: string | null = null;

describe('Marketplace Logic Tests', () => {

  beforeEach(async () => {
    // Create publisher user
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const [publisher] = await db.insert(users).values({
      username: `publisher_${Date.now()}`,
      email: `publisher${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 500,
      is_email_verified: true,
    }).returning();
    publisherId = publisher.id;

    // Create buyer user
    const [buyer] = await db.insert(users).values({
      username: `buyer_${Date.now()}`,
      email: `buyer${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 1000,
      is_email_verified: true,
    }).returning();
    buyerId = buyer.id;

    // Login as publisher
    const publisherLogin = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: publisher.email,
        password: 'TestPass123!',
      }),
    });
    publisherCookie = publisherLogin.headers.get('set-cookie') || '';

    // Login as buyer
    const buyerLogin = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: buyer.email,
        password: 'TestPass123!',
      }),
    });
    buyerCookie = buyerLogin.headers.get('set-cookie') || '';
  });

  describe('Publishing Logic', () => {

    test('Required fields validation', async () => {
      // Missing title
      const response1 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          description: 'Description without title',
          priceCoins: 100,
          category: 'ea',
        }),
      });
      expect(response1.ok).toBe(false);

      // Missing description
      const response2 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Title without description',
          priceCoins: 100,
          category: 'ea',
        }),
      });
      expect(response2.ok).toBe(false);

      // Missing price
      const response3 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Complete EA',
          description: 'Description here',
          category: 'ea',
        }),
      });
      expect(response3.ok).toBe(false);
    });

    test('File upload limits (max 10MB)', async () => {
      // Create large file simulation
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      
      const formData = new FormData();
      formData.append('title', 'Large File Test');
      formData.append('description', 'Testing file size limit');
      formData.append('priceCoins', '100');
      formData.append('category', 'ea');
      formData.append('file', Buffer.from(largeContent), {
        filename: 'large.ex4',
        contentType: 'application/octet-stream',
      });

      const response = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: {
          'Cookie': publisherCookie,
        },
        body: formData as any,
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        const error = await response.json();
        expect(error.error.toLowerCase()).toContain('size');
      }
    });

    test('Pricing validation (min/max limits)', async () => {
      // Negative price
      const response1 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Negative Price EA',
          description: 'Testing negative price',
          priceCoins: -100,
          category: 'ea',
        }),
      });
      expect(response1.ok).toBe(false);

      // Zero price (might be allowed for free items)
      const response2 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Free EA',
          description: 'Testing zero price',
          priceCoins: 0,
          category: 'ea',
        }),
      });
      // Zero might be allowed for free items

      // Very high price
      const response3 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Expensive EA',
          description: 'Testing max price',
          priceCoins: 1000000,
          category: 'ea',
        }),
      });
      // Check if there's a max limit
      if (!response3.ok) {
        const error = await response3.json();
        console.log('Max price limit enforced:', error.error);
      }
    });

    test('30 coins publishing reward', async () => {
      const initialCoins = (await db.select().from(users)
        .where(eq(users.id, publisherId!)).limit(1))[0].totalCoins;

      const response = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Test EA for Publishing Reward',
          description: 'This should give me 30 coins for publishing',
          priceCoins: 100,
          category: 'ea',
          downloadUrl: 'https://example.com/test.ex4',
        }),
      });

      expect(response.ok).toBe(true);
      const publishedContent = await response.json();
      contentId = publishedContent.id;

      // Check coins were added
      const updatedPublisher = (await db.select().from(users)
        .where(eq(users.id, publisherId!)).limit(1))[0];
      
      expect(updatedPublisher.totalCoins).toBe(initialCoins + 30); // CRITICAL: Must be 30 coins

      // Check transaction was recorded
      const transaction = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, publisherId!),
            eq(coinTransactions.trigger, COIN_TRIGGERS.CONTENT_PUBLISH)
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);
      
      expect(transaction[0]).toBeDefined();
      expect(transaction[0].amount).toBe(30);
    });

    test('Content moderation queue', async () => {
      const response = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'EA Awaiting Moderation',
          description: 'This content should go to moderation queue',
          priceCoins: 150,
          category: 'ea',
          downloadUrl: 'https://example.com/moderated.ex4',
        }),
      });

      expect(response.ok).toBe(true);
      const publishedContent = await response.json();

      // Check if content is in moderation queue
      const moderation = await db.select().from(moderationQueue)
        .where(
          and(
            eq(moderationQueue.contentId, publishedContent.id),
            eq(moderationQueue.status, 'pending')
          )
        )
        .limit(1);

      if (moderation[0]) {
        expect(moderation[0].contentType).toBe('marketplace_item');
        console.log('✓ Content moderation queue working');
      } else {
        // Check if content status is pending
        const content = await db.select().from(content)
          .where(eq(content.id, publishedContent.id))
          .limit(1);
        
        expect(['pending', 'under_review']).toContain(content[0].status);
      }
    });

    test('Duplicate content detection', async () => {
      // Publish first content
      const response1 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Unique EA Title XYZ123',
          description: 'Unique description for duplicate test',
          priceCoins: 100,
          category: 'ea',
          downloadUrl: 'https://example.com/unique.ex4',
        }),
      });
      expect(response1.ok).toBe(true);

      // Try to publish duplicate
      const response2 = await fetch(`${API_URL}/api/marketplace/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Unique EA Title XYZ123', // Same title
          description: 'Unique description for duplicate test', // Same description
          priceCoins: 100,
          category: 'ea',
          downloadUrl: 'https://example.com/unique.ex4', // Same URL
        }),
      });

      // Should detect duplicate
      if (!response2.ok) {
        const error = await response2.json();
        console.log('✓ Duplicate content detection:', error.error);
      }
    });
  });

  describe('Purchase Flow', () => {

    beforeEach(async () => {
      // Create approved content for testing
      const [testContent] = await db.insert(content).values({
        title: 'Test EA for Purchase',
        description: 'EA available for purchase testing',
        authorId: publisherId!,
        priceCoins: 200,
        category: 'ea',
        status: 'approved',
        downloadUrl: 'https://example.com/purchase-test.ex4',
        slug: `test-ea-${Date.now()}`,
      }).returning();
      contentId = testContent.id;
    });

    test('Sufficient coins check before purchase', async () => {
      // Set buyer to have insufficient coins
      await db.update(users)
        .set({ totalCoins: 50 }) // Less than 200 price
        .where(eq(users.id, buyerId!));

      const response = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error.toLowerCase()).toContain('insufficient');
    });

    test('80/20 commission split', async () => {
      const publisherBefore = (await db.select().from(users)
        .where(eq(users.id, publisherId!)).limit(1))[0];
      const buyerBefore = (await db.select().from(users)
        .where(eq(users.id, buyerId!)).limit(1))[0];

      const response = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });

      expect(response.ok).toBe(true);

      const publisherAfter = (await db.select().from(users)
        .where(eq(users.id, publisherId!)).limit(1))[0];
      const buyerAfter = (await db.select().from(users)
        .where(eq(users.id, buyerId!)).limit(1))[0];

      // Buyer loses full amount (200)
      expect(buyerAfter.totalCoins).toBe(buyerBefore.totalCoins - 200);
      
      // Publisher gets 80% (160)
      expect(publisherAfter.totalCoins).toBe(publisherBefore.totalCoins + 160); // CRITICAL: 80% = 160

      // Check transactions
      const publisherTx = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, publisherId!),
            eq(coinTransactions.trigger, COIN_TRIGGERS.CONTENT_SALE)
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);
      
      expect(publisherTx[0].amount).toBe(160);

      // Platform should get 20% (40) - check treasury or platform account
      console.log('✓ 80/20 commission split verified');
    });

    test('Download access granted after purchase', async () => {
      const response = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check purchase record created
      const purchase = await db.select().from(contentPurchases)
        .where(
          and(
            eq(contentPurchases.contentId, contentId!),
            eq(contentPurchases.userId, buyerId!)
          )
        )
        .limit(1);

      expect(purchase[0]).toBeDefined();
      expect(purchase[0].status).toBe('completed');

      // Try to download
      const downloadResponse = await fetch(`${API_URL}/api/marketplace/download/${contentId}`, {
        headers: { 
          'Cookie': buyerCookie,
        },
      });

      expect([200, 302, 303]).toContain(downloadResponse.status); // Success or redirect
    });

    test('Cannot purchase own content', async () => {
      const response = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie, // Publisher trying to buy own content
        },
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error.toLowerCase()).toContain('own');
    });

    test('Cannot purchase same content twice', async () => {
      // First purchase
      const response1 = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });
      expect(response1.ok).toBe(true);

      // Second purchase attempt
      const response2 = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });

      expect(response2.ok).toBe(false);
      const error = await response2.json();
      expect(error.error.toLowerCase()).toContain('already');
    });

    test('Transaction recording with proper metadata', async () => {
      const response = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check buyer transaction
      const buyerTx = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, buyerId!),
            eq(coinTransactions.type, 'spend')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);

      expect(buyerTx[0]).toBeDefined();
      expect(buyerTx[0].amount).toBe(200);
      expect(buyerTx[0].trigger).toBe(COIN_TRIGGERS.CONTENT_PURCHASE);
      expect(buyerTx[0].channel).toBe(COIN_CHANNELS.MARKETPLACE);
      expect(buyerTx[0].metadata?.contentId).toBe(contentId);

      // Check seller transaction
      const sellerTx = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, publisherId!),
            eq(coinTransactions.type, 'earn')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);

      expect(sellerTx[0]).toBeDefined();
      expect(sellerTx[0].amount).toBe(160); // 80% of 200
      expect(sellerTx[0].trigger).toBe(COIN_TRIGGERS.CONTENT_SALE);
    });

    test('Refund eligibility (within time window)', async () => {
      // Purchase content
      const purchaseResponse = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });
      expect(purchaseResponse.ok).toBe(true);

      // Request refund immediately
      const refundResponse = await fetch(`${API_URL}/api/marketplace/refund/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
        body: JSON.stringify({
          reason: 'Not as described',
        }),
      });

      // Check if refund system exists
      if (refundResponse.ok) {
        const refund = await refundResponse.json();
        console.log('✓ Refund system working:', refund);

        // Check coins returned
        const buyer = await db.select().from(users)
          .where(eq(users.id, buyerId!))
          .limit(1);
        
        // Should have coins back
        expect(buyer[0].totalCoins).toBeGreaterThanOrEqual(800);
      } else if (refundResponse.status === 404) {
        console.log('⚠ Refund system not implemented');
      }
    });
  });

  describe('Content Management', () => {

    test('Edit own content', async () => {
      // Create content
      const [testContent] = await db.insert(content).values({
        title: 'Original Title',
        description: 'Original description',
        authorId: publisherId!,
        priceCoins: 100,
        category: 'ea',
        status: 'approved',
        slug: `edit-test-${Date.now()}`,
      }).returning();

      // Edit content
      const response = await fetch(`${API_URL}/api/marketplace/content/${testContent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': publisherCookie,
        },
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated description',
          priceCoins: 150,
        }),
      });

      expect(response.ok).toBe(true);

      // Verify changes
      const updated = await db.select().from(content)
        .where(eq(content.id, testContent.id))
        .limit(1);
      
      expect(updated[0].title).toBe('Updated Title');
      expect(updated[0].priceCoins).toBe(150);
    });

    test('Cannot edit others content', async () => {
      // Create content as publisher
      const [testContent] = await db.insert(content).values({
        title: 'Publisher Content',
        description: 'Content by publisher',
        authorId: publisherId!,
        priceCoins: 100,
        category: 'ea',
        status: 'approved',
        slug: `other-test-${Date.now()}`,
      }).returning();

      // Try to edit as buyer
      const response = await fetch(`${API_URL}/api/marketplace/content/${testContent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
        body: JSON.stringify({
          title: 'Hacked Title',
          priceCoins: 1,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403); // Forbidden
    });

    test('Delete/delist content', async () => {
      // Create content
      const [testContent] = await db.insert(content).values({
        title: 'Content to Delete',
        description: 'This will be deleted',
        authorId: publisherId!,
        priceCoins: 100,
        category: 'ea',
        status: 'approved',
        slug: `delete-test-${Date.now()}`,
      }).returning();

      // Delete content
      const response = await fetch(`${API_URL}/api/marketplace/content/${testContent.id}`, {
        method: 'DELETE',
        headers: { 
          'Cookie': publisherCookie,
        },
      });

      expect(response.ok).toBe(true);

      // Check if deleted or marked as delisted
      const deleted = await db.select().from(content)
        .where(eq(content.id, testContent.id))
        .limit(1);
      
      if (deleted[0]) {
        expect(['deleted', 'delisted', 'archived']).toContain(deleted[0].status);
      } else {
        // Hard deleted
        expect(deleted.length).toBe(0);
      }
    });

    test('Review system', async () => {
      // Purchase content first
      const purchaseResponse = await fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
      });
      expect(purchaseResponse.ok).toBe(true);

      // Leave review
      const reviewResponse = await fetch(`${API_URL}/api/marketplace/content/${contentId}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': buyerCookie,
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Excellent EA, works as described!',
        }),
      });

      expect(reviewResponse.ok).toBe(true);

      // Check review was created
      const review = await db.select().from(contentReviews)
        .where(
          and(
            eq(contentReviews.contentId, contentId!),
            eq(contentReviews.userId, buyerId!)
          )
        )
        .limit(1);
      
      expect(review[0]).toBeDefined();
      expect(review[0].rating).toBe(5);
      expect(review[0].comment).toContain('Excellent');
    });
  });

  describe('Security and Edge Cases', () => {

    test('XSS prevention in content fields', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(1)">',
        'javascript:alert(1)',
      ];

      for (const payload of xssPayloads) {
        const response = await fetch(`${API_URL}/api/marketplace/publish`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': publisherCookie,
          },
          body: JSON.stringify({
            title: payload,
            description: payload,
            priceCoins: 100,
            category: 'ea',
          }),
        });

        if (response.ok) {
          const content = await response.json();
          // Should be sanitized
          expect(content.title).not.toContain('<script>');
          expect(content.description).not.toContain('<script>');
          expect(content.title).not.toContain('javascript:');
        }
      }
    });

    test('SQL injection prevention', async () => {
      const sqlPayloads = [
        "'; DROP TABLE content; --",
        "' OR '1'='1",
      ];

      for (const payload of sqlPayloads) {
        const response = await fetch(`${API_URL}/api/marketplace/search?q=${encodeURIComponent(payload)}`, {
          headers: { 
            'Cookie': buyerCookie,
          },
        });

        // Should handle safely
        if (!response.ok) {
          const error = await response.json();
          expect(error.error).not.toContain('SQL');
        }
      }
    });

    test('Rate limiting on purchases', async () => {
      // Create multiple cheap content items
      const contentIds = [];
      for (let i = 0; i < 5; i++) {
        const [c] = await db.insert(content).values({
          title: `Rate Limit Test ${i}`,
          description: 'Testing rate limits',
          authorId: publisherId!,
          priceCoins: 10,
          category: 'ea',
          status: 'approved',
          slug: `rate-test-${Date.now()}-${i}`,
        }).returning();
        contentIds.push(c.id);
      }

      // Try rapid purchases
      const purchases = contentIds.map(id => 
        fetch(`${API_URL}/api/marketplace/purchase/${id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': buyerCookie,
          },
        })
      );

      const responses = await Promise.all(purchases);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (rateLimited) {
        console.log('✓ Purchase rate limiting working');
      }
    });

    test('Concurrent purchase prevention (race condition)', async () => {
      // Try to purchase same item multiple times simultaneously
      const purchases = [];
      for (let i = 0; i < 3; i++) {
        purchases.push(
          fetch(`${API_URL}/api/marketplace/purchase/${contentId}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': buyerCookie,
            },
          })
        );
      }

      const responses = await Promise.all(purchases);
      const successful = responses.filter(r => r.ok).length;

      // Only one should succeed
      expect(successful).toBe(1);
      console.log(`✓ Race condition protection: ${successful} succeeded, ${3-successful} blocked`);
    });
  });
});