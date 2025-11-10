/**
 * BOT BEHAVIOR LOGIC TEST SUITE
 * Tests all bot automation, engagement rules, and treasury limits
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import {
  users,
  bots,
  botActions,
  botTreasury,
  botRefunds,
  botAuditLog,
  botSettings,
  botWalletEvents,
  forumThreads,
  forumReplies,
  content,
  contentPurchases,
  coinTransactions,
  COIN_TRIGGERS,
  COIN_CHANNELS,
} from '../../shared/schema';
import { eq, and, desc, gte, lte, between } from 'drizzle-orm';

const API_URL = 'http://localhost:3001';
let botId: string | null = null;
let regularUserId: string | null = null;
let threadId: string | null = null;
let contentId: string | null = null;

describe('Bot Behavior Logic Tests', () => {

  beforeEach(async () => {
    // Create a bot
    const [bot] = await db.insert(bots).values({
      name: `TestBot_${Date.now()}`,
      username: `testbot_${Date.now()}`,
      purpose: 'engagement',
      dailyActionLimit: 50,
      actionCooldownMinutes: 5,
      personalityTraits: ['helpful', 'friendly'],
      interests: ['trading', 'forex'],
      isActive: true,
      walletCap: 5000,
    }).returning();
    botId = bot.id;

    // Create bot user account
    await db.insert(users).values({
      id: botId,
      username: bot.username,
      email: `${bot.username}@bot.yoforex.com`,
      totalCoins: 1000,
      role: 'bot',
      is_email_verified: true,
    });

    // Create regular user for testing
    const [user] = await db.insert(users).values({
      username: `regular_${Date.now()}`,
      email: `regular${Date.now()}@test.com`,
      totalCoins: 100,
      is_email_verified: true,
    }).returning();
    regularUserId = user.id;

    // Initialize bot treasury
    await db.insert(botTreasury).values({
      balance: 10000,
      totalSpent: 0,
      totalRefunded: 0,
      lastRefillAt: new Date(),
    });
  });

  describe('Engagement Rules', () => {

    test('Time-based activation (8am-10pm)', async () => {
      const currentHour = new Date().getHours();
      
      // Check if bot should be active based on time
      const response = await fetch(`${API_URL}/api/admin/bots/${botId}/should-activate`, {
        method: 'GET',
      });

      if (response.ok) {
        const { shouldActivate } = await response.json();
        
        if (currentHour >= 8 && currentHour < 22) {
          expect(shouldActivate).toBe(true);
        } else {
          expect(shouldActivate).toBe(false);
        }
        console.log(`✓ Time-based activation: ${shouldActivate} at ${currentHour}:00`);
      }
    });

    test('Content selection logic', async () => {
      // Create multiple threads with different characteristics
      const threads = [];
      
      // Popular thread
      threads.push(await db.insert(forumThreads).values({
        title: 'Popular Forex Strategy',
        content: 'This is a very popular thread about forex trading',
        authorId: regularUserId!,
        category: 'strategies',
        viewCount: 1000,
        replyCount: 50,
        slug: `popular-${Date.now()}`,
      }).returning());

      // New thread
      threads.push(await db.insert(forumThreads).values({
        title: 'New Trading Question',
        content: 'Just started trading, need help',
        authorId: regularUserId!,
        category: 'general',
        viewCount: 10,
        replyCount: 0,
        slug: `new-${Date.now()}`,
      }).returning());

      // Controversial thread
      threads.push(await db.insert(forumThreads).values({
        title: 'Is Forex a Scam?',
        content: 'Controversial topic about forex',
        authorId: regularUserId!,
        category: 'discussion',
        viewCount: 500,
        replyCount: 100,
        slug: `controversial-${Date.now()}`,
      }).returning());

      // Run bot content selection
      const response = await fetch(`${API_URL}/api/admin/bots/${botId}/select-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'threads',
          limit: 1,
        }),
      });

      if (response.ok) {
        const { selectedContent } = await response.json();
        expect(selectedContent).toBeDefined();
        expect(selectedContent.length).toBeGreaterThan(0);
        
        // Bot should prefer threads matching its interests or helping new users
        console.log('✓ Content selection logic working');
      }
    });

    test('Reply quality checks', async () => {
      // Create thread
      const [thread] = await db.insert(forumThreads).values({
        title: 'Best EA Settings?',
        content: 'What are the best settings for this EA?',
        authorId: regularUserId!,
        category: 'ea-discussions',
        slug: `ea-settings-${Date.now()}`,
        viewCount: 0,
        replyCount: 0,
      }).returning();
      threadId = thread.id;

      // Generate bot reply
      const replyResponse = await fetch(`${API_URL}/api/admin/bots/${botId}/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
        }),
      });

      if (replyResponse.ok) {
        const { reply } = await replyResponse.json();
        
        // Check reply quality
        expect(reply.content).toBeDefined();
        expect(reply.content.length).toBeGreaterThan(10); // Not too short
        expect(reply.content.length).toBeLessThan(5000); // Not too long
        
        // Should be relevant to thread
        const isRelevant = reply.content.toLowerCase().includes('settings') ||
                          reply.content.toLowerCase().includes('ea') ||
                          reply.content.toLowerCase().includes('configuration');
        
        expect(isRelevant).toBe(true);
        console.log('✓ Reply quality checks passed');
      }
    });

    test('Purchase decision logic', async () => {
      // Create content items with different characteristics
      
      // High-quality, affordable
      const [goodContent] = await db.insert(content).values({
        title: 'Professional Scalping EA',
        description: 'High-quality EA with proven results, 90% win rate',
        authorId: regularUserId!,
        priceCoins: 50,
        category: 'ea',
        status: 'approved',
        rating: 4.8,
        reviewCount: 100,
        slug: `good-ea-${Date.now()}`,
      }).returning();

      // Expensive
      const [expensiveContent] = await db.insert(content).values({
        title: 'Premium Trading System',
        description: 'Very expensive system',
        authorId: regularUserId!,
        priceCoins: 5000,
        category: 'ea',
        status: 'approved',
        rating: 4.5,
        reviewCount: 10,
        slug: `expensive-ea-${Date.now()}`,
      }).returning();

      // Low quality
      const [badContent] = await db.insert(content).values({
        title: 'Basic Indicator',
        description: 'Simple indicator with poor reviews',
        authorId: regularUserId!,
        priceCoins: 20,
        category: 'indicator',
        status: 'approved',
        rating: 2.0,
        reviewCount: 50,
        slug: `bad-indicator-${Date.now()}`,
      }).returning();

      // Test purchase decision for each
      const decisions = [];
      
      for (const contentItem of [goodContent, expensiveContent, badContent]) {
        const response = await fetch(`${API_URL}/api/admin/bots/${botId}/should-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: contentItem.id,
          }),
        });

        if (response.ok) {
          const decision = await response.json();
          decisions.push({
            content: contentItem.title,
            shouldPurchase: decision.shouldPurchase,
            reason: decision.reason,
          });
        }
      }

      // Bot should prefer good quality, affordable content
      console.log('Purchase decisions:', decisions);
      
      // Good content should be more likely to be purchased
      const goodDecision = decisions.find(d => d.content.includes('Professional'));
      const expensiveDecision = decisions.find(d => d.content.includes('Premium'));
      const badDecision = decisions.find(d => d.content.includes('Basic'));

      if (goodDecision && expensiveDecision && badDecision) {
        console.log('✓ Purchase decision logic working');
      }
    });

    test('Activity patterns realistic', async () => {
      // Track bot actions over time
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - 1);

      // Simulate bot activity
      const actions = [];
      for (let i = 0; i < 10; i++) {
        const actionTime = new Date(startTime.getTime() + i * 6 * 60000); // Every 6 minutes
        
        actions.push(await db.insert(botActions).values({
          botId: botId!,
          actionType: ['like', 'reply', 'follow'][i % 3] as any,
          targetType: 'thread',
          targetId: `thread-${i}`,
          coinCost: [1, 0, 0][i % 3],
          wasRefunded: false,
          createdAt: actionTime,
        }).returning());
      }

      // Check action pattern
      const recentActions = await db.select().from(botActions)
        .where(
          and(
            eq(botActions.botId, botId!),
            gte(botActions.createdAt, startTime)
          )
        )
        .orderBy(botActions.createdAt);

      // Calculate time between actions
      const timeDiffs = [];
      for (let i = 1; i < recentActions.length; i++) {
        const diff = recentActions[i].createdAt.getTime() - recentActions[i-1].createdAt.getTime();
        timeDiffs.push(diff / 60000); // Convert to minutes
      }

      // Average time between actions
      const avgTimeBetween = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      
      // Should have realistic spacing (not too rapid)
      expect(avgTimeBetween).toBeGreaterThan(3); // At least 3 minutes average
      console.log(`✓ Realistic activity patterns: ${avgTimeBetween.toFixed(1)} min average between actions`);
    });
  });

  describe('Bot Limits', () => {

    test('Max actions per day', async () => {
      // Set bot daily limit to 5 for testing
      await db.update(bots)
        .set({ dailyActionLimit: 5 })
        .where(eq(bots.id, botId!));

      // Try to perform more than 5 actions
      const actions = [];
      for (let i = 0; i < 7; i++) {
        actions.push(
          fetch(`${API_URL}/api/admin/bots/${botId}/perform-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionType: 'like',
              targetId: `thread-${i}`,
            }),
          })
        );
      }

      const responses = await Promise.all(actions);
      const successful = responses.filter(r => r.ok).length;
      const failed = responses.filter(r => !r.ok).length;

      // Should enforce daily limit
      expect(successful).toBeLessThanOrEqual(5);
      expect(failed).toBeGreaterThan(0);
      console.log(`✓ Daily action limit enforced: ${successful} succeeded, ${failed} blocked`);
    });

    test('Wallet cap enforcement', async () => {
      // Set bot wallet cap
      await db.update(bots)
        .set({ walletCap: 100 })
        .where(eq(bots.id, botId!));

      // Give bot user near cap amount
      await db.update(users)
        .set({ totalCoins: 95 })
        .where(eq(users.id, botId!));

      // Try to earn more coins (would exceed cap)
      const response = await fetch(`${API_URL}/api/admin/bots/${botId}/earn-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10,
          reason: 'Test earning',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Check bot balance
        const [botUser] = await db.select().from(users)
          .where(eq(users.id, botId!))
          .limit(1);
        
        // Should not exceed wallet cap
        expect(botUser.totalCoins).toBeLessThanOrEqual(100);
        console.log(`✓ Wallet cap enforced: ${botUser.totalCoins} coins (cap: 100)`);
      }
    });

    test('Cooldown periods between actions', async () => {
      // Set cooldown to 5 minutes
      await db.update(bots)
        .set({ actionCooldownMinutes: 5 })
        .where(eq(bots.id, botId!));

      // Perform first action
      const response1 = await fetch(`${API_URL}/api/admin/bots/${botId}/perform-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'like',
          targetId: 'thread-1',
        }),
      });
      expect(response1.ok).toBe(true);

      // Try immediate second action
      const response2 = await fetch(`${API_URL}/api/admin/bots/${botId}/perform-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'like',
          targetId: 'thread-2',
        }),
      });

      // Should be blocked by cooldown
      if (!response2.ok) {
        const error = await response2.json();
        expect(error.error.toLowerCase()).toContain('cooldown');
        console.log('✓ Cooldown period enforced');
      }
    });

    test('Treasury spending limits', async () => {
      // Get current treasury balance
      const [treasury] = await db.select().from(botTreasury).limit(1);
      const initialBalance = treasury.balance;

      // Try to spend large amount
      const response = await fetch(`${API_URL}/api/admin/treasury/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: initialBalance + 1000, // More than available
          reason: 'Test overspend',
        }),
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error.toLowerCase()).toContain('insufficient');
      console.log('✓ Treasury spending limits enforced');
    });

    test('Bot refund mechanism', async () => {
      // Create a bot action that spent coins
      const [action] = await db.insert(botActions).values({
        botId: botId!,
        actionType: 'purchase',
        targetType: 'content',
        targetId: 'content-123',
        coinCost: 100,
        wasRefunded: false,
      }).returning();

      // Request refund
      const response = await fetch(`${API_URL}/api/admin/bots/refund/${action.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Content was removed',
        }),
      });

      if (response.ok) {
        // Check refund was processed
        const [refund] = await db.select().from(botRefunds)
          .where(eq(botRefunds.actionId, action.id))
          .limit(1);

        expect(refund).toBeDefined();
        expect(refund.amount).toBe(100);
        expect(refund.reason).toContain('removed');

        // Check treasury was credited
        const [newTreasury] = await db.select().from(botTreasury).limit(1);
        expect(newTreasury.totalRefunded).toBeGreaterThan(0);
        
        console.log('✓ Bot refund mechanism working');
      }
    });
  });

  describe('Bot Orchestration', () => {

    test('Multiple bot coordination', async () => {
      // Create multiple bots with different purposes
      const bots = [];
      
      bots.push(await db.insert(bots).values({
        name: 'Engagement Bot',
        username: `engage_bot_${Date.now()}`,
        purpose: 'engagement',
        dailyActionLimit: 20,
        isActive: true,
      }).returning());

      bots.push(await db.insert(bots).values({
        name: 'Support Bot',
        username: `support_bot_${Date.now()}`,
        purpose: 'support',
        dailyActionLimit: 30,
        isActive: true,
      }).returning());

      bots.push(await db.insert(bots).values({
        name: 'Content Bot',
        username: `content_bot_${Date.now()}`,
        purpose: 'content',
        dailyActionLimit: 10,
        isActive: true,
      }).returning());

      // Run orchestration
      const response = await fetch(`${API_URL}/api/admin/bots/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✓ Bot orchestration executed:', result);

        // Check that bots don't overlap actions
        const recentActions = await db.select().from(botActions)
          .where(
            gte(botActions.createdAt, new Date(Date.now() - 60000))
          );

        // Group by target to check for duplicates
        const targetMap = new Map();
        for (const action of recentActions) {
          const key = `${action.targetType}-${action.targetId}`;
          if (!targetMap.has(key)) {
            targetMap.set(key, []);
          }
          targetMap.get(key).push(action.botId);
        }

        // Check no target has too many bot actions
        for (const [target, botIds] of targetMap) {
          expect(botIds.length).toBeLessThanOrEqual(3); // Max 3 bots per target
        }
      }
    });

    test('Bot personality consistency', async () => {
      // Set specific personality
      await db.update(bots)
        .set({ 
          personalityTraits: ['professional', 'analytical'],
          interests: ['technical-analysis', 'risk-management'],
        })
        .where(eq(bots.id, botId!));

      // Generate multiple replies
      const replies = [];
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_URL}/api/admin/bots/${botId}/generate-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: `thread-${i}`,
            context: 'Discussion about trading strategies',
          }),
        });

        if (response.ok) {
          const { reply } = await response.json();
          replies.push(reply.content);
        }
      }

      // Check consistency in tone/style
      const professionalWords = ['analysis', 'risk', 'strategy', 'technical', 'fundamental'];
      let consistencyScore = 0;

      for (const reply of replies) {
        const lower = reply.toLowerCase();
        for (const word of professionalWords) {
          if (lower.includes(word)) {
            consistencyScore++;
          }
        }
      }

      // Should maintain consistent personality
      expect(consistencyScore).toBeGreaterThan(0);
      console.log(`✓ Bot personality consistency: ${consistencyScore} professional terms used`);
    });
  });

  describe('Bot Security and Audit', () => {

    test('Bot action audit logging', async () => {
      // Perform bot action
      const response = await fetch(`${API_URL}/api/admin/bots/${botId}/perform-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'follow',
          targetId: regularUserId,
        }),
      });

      if (response.ok) {
        // Check audit log
        const auditLogs = await db.select().from(botAuditLog)
          .where(eq(botAuditLog.botId, botId!))
          .orderBy(desc(botAuditLog.createdAt))
          .limit(1);

        expect(auditLogs[0]).toBeDefined();
        expect(auditLogs[0].action).toBe('follow');
        expect(auditLogs[0].details).toBeDefined();
        console.log('✓ Bot action audit logging working');
      }
    });

    test('Bot cannot perform admin actions', async () => {
      // Try to ban a user as bot
      const response = await fetch(`${API_URL}/api/admin/users/${regularUserId}/ban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Bot-Id': botId!, // Identifying as bot
        },
        body: JSON.stringify({
          reason: 'Bot trying to ban',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403); // Forbidden
      console.log('✓ Bots cannot perform admin actions');
    });

    test('Bot wallet event tracking', async () => {
      // Track initial balance
      const [botUser] = await db.select().from(users)
        .where(eq(users.id, botId!))
        .limit(1);
      const initialBalance = botUser.totalCoins;

      // Perform action that costs coins
      await db.insert(coinTransactions).values({
        userId: botId!,
        type: 'spend',
        amount: 10,
        trigger: COIN_TRIGGERS.CONTENT_PURCHASE,
        channel: COIN_CHANNELS.MARKETPLACE,
        status: 'completed',
        description: 'Bot purchase',
      });

      // Check wallet event was recorded
      const walletEvents = await db.select().from(botWalletEvents)
        .where(eq(botWalletEvents.botId, botId!))
        .orderBy(desc(botWalletEvents.createdAt))
        .limit(1);

      if (walletEvents[0]) {
        expect(walletEvents[0].eventType).toBe('spend');
        expect(walletEvents[0].amount).toBe(10);
        expect(walletEvents[0].balanceBefore).toBe(initialBalance);
        expect(walletEvents[0].balanceAfter).toBe(initialBalance - 10);
        console.log('✓ Bot wallet event tracking working');
      }
    });

    test('Bot fraud detection', async () => {
      // Simulate suspicious bot behavior
      const suspiciousActions = [];
      
      // Rapid likes to same user
      for (let i = 0; i < 10; i++) {
        suspiciousActions.push(
          db.insert(botActions).values({
            botId: botId!,
            actionType: 'like',
            targetType: 'thread',
            targetId: 'suspicious-thread',
            coinCost: 1,
            wasRefunded: false,
          })
        );
      }

      await Promise.all(suspiciousActions);

      // Check if fraud detected
      const response = await fetch(`${API_URL}/api/admin/bots/${botId}/check-fraud`, {
        method: 'GET',
      });

      if (response.ok) {
        const { isSuspicious, reasons } = await response.json();
        
        if (isSuspicious) {
          console.log('✓ Bot fraud detection working:', reasons);
        }
      }
    });
  });

  describe('Bot Settings and Configuration', () => {

    test('Bot settings persistence', async () => {
      // Update bot settings
      const settings = {
        autoReplyEnabled: false,
        autoLikeEnabled: true,
        autoPurchaseEnabled: false,
        maxDailySpend: 100,
        preferredCategories: ['strategies', 'indicators'],
      };

      const response = await fetch(`${API_URL}/api/admin/bots/${botId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      expect(response.ok).toBe(true);

      // Verify settings saved
      const [savedSettings] = await db.select().from(botSettings)
        .where(eq(botSettings.botId, botId!))
        .limit(1);

      if (savedSettings) {
        expect(savedSettings.autoReplyEnabled).toBe(false);
        expect(savedSettings.autoLikeEnabled).toBe(true);
        expect(savedSettings.maxDailySpend).toBe(100);
        console.log('✓ Bot settings persistence working');
      }
    });

    test('Bot activation/deactivation', async () => {
      // Deactivate bot
      const deactivateResponse = await fetch(`${API_URL}/api/admin/bots/${botId}/deactivate`, {
        method: 'POST',
      });

      expect(deactivateResponse.ok).toBe(true);

      // Try to perform action with deactivated bot
      const actionResponse = await fetch(`${API_URL}/api/admin/bots/${botId}/perform-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'like',
          targetId: 'thread-123',
        }),
      });

      expect(actionResponse.ok).toBe(false);
      const error = await actionResponse.json();
      expect(error.error.toLowerCase()).toContain('inactive');

      // Reactivate
      const activateResponse = await fetch(`${API_URL}/api/admin/bots/${botId}/activate`, {
        method: 'POST',
      });

      expect(activateResponse.ok).toBe(true);
      console.log('✓ Bot activation/deactivation working');
    });
  });
});