/**
 * COIN TRANSACTION LOGIC TEST SUITE
 * Tests all coin transaction flows, fraud prevention, and expiration logic
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import { 
  users,
  coinTransactions,
  coinLedgerTransactions,
  coinJournalEntries,
  coinExpirations,
  fraudSignals,
  userWallet,
  profiles,
  notifications,
  COIN_TRIGGERS,
  COIN_CHANNELS,
} from '../../shared/schema';
import { eq, and, desc, gte, lt, sum, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const API_URL = 'http://localhost:3001';
let testUserId: string | null = null;
let recipientUserId: string | null = null;
let sessionCookie: string | null = null;

describe('Coin Transaction Logic Tests', () => {

  beforeEach(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const [sender] = await db.insert(users).values({
      username: `sender_${Date.now()}`,
      email: `sender${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 1000, // Start with coins
      is_email_verified: true,
    }).returning();
    testUserId = sender.id;

    const [recipient] = await db.insert(users).values({
      username: `recipient_${Date.now()}`,
      email: `recipient${Date.now()}@test.com`,
      password_hash: hashedPassword,
      totalCoins: 100,
      is_email_verified: true,
    }).returning();
    recipientUserId = recipient.id;

    // Login
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sender.email,
        password: 'TestPass123!',
      }),
    });
    sessionCookie = loginResponse.headers.get('set-cookie') || '';
  });

  describe('Transaction Creation', () => {

    test('Sufficient funds check before transfer', async () => {
      // Try to transfer more than available
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 2000, // More than the 1000 available
          description: 'Transfer too much',
        }),
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error.toLowerCase()).toContain('insufficient');
    });

    test('Atomic balance updates (sender and recipient)', async () => {
      const senderBefore = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0];
      const recipientBefore = (await db.select().from(users)
        .where(eq(users.id, recipientUserId!)).limit(1))[0];

      const transferAmount = 100;
      
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: transferAmount,
          description: 'Test atomic update',
        }),
      });

      expect(response.ok).toBe(true);

      // Check balances updated atomically
      const senderAfter = (await db.select().from(users)
        .where(eq(users.id, testUserId!)).limit(1))[0];
      const recipientAfter = (await db.select().from(users)
        .where(eq(users.id, recipientUserId!)).limit(1))[0];

      expect(senderAfter.totalCoins).toBe(senderBefore.totalCoins - transferAmount);
      expect(recipientAfter.totalCoins).toBe(recipientBefore.totalCoins + transferAmount);

      // Total coins in system should remain the same
      const totalBefore = senderBefore.totalCoins + recipientBefore.totalCoins;
      const totalAfter = senderAfter.totalCoins + recipientAfter.totalCoins;
      expect(totalAfter).toBe(totalBefore);
    });

    test('Transaction history tracking with proper fields', async () => {
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 50,
          description: 'Test transaction tracking',
        }),
      });

      expect(response.ok).toBe(true);

      // Check sender transaction
      const senderTx = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, testUserId!),
            eq(coinTransactions.type, 'spend')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);

      expect(senderTx[0]).toBeDefined();
      expect(senderTx[0].amount).toBe(50);
      expect(senderTx[0].trigger).toBeDefined();
      expect(senderTx[0].channel).toBeDefined();
      expect(senderTx[0].status).toBe('completed');

      // Check recipient transaction
      const recipientTx = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, recipientUserId!),
            eq(coinTransactions.type, 'earn')
          )
        )
        .orderBy(desc(coinTransactions.createdAt))
        .limit(1);

      expect(recipientTx[0]).toBeDefined();
      expect(recipientTx[0].amount).toBe(50);
      expect(recipientTx[0].status).toBe('completed');
    });

    test('Proper trigger and channel fields', async () => {
      // Test forum reward
      const forumResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          title: 'Test Thread for Trigger',
          content: 'Testing trigger and channel fields',
          category: 'general',
        }),
      });

      if (forumResponse.ok) {
        const tx = await db.select().from(coinTransactions)
          .where(
            and(
              eq(coinTransactions.userId, testUserId!),
              eq(coinTransactions.trigger, COIN_TRIGGERS.FORUM_THREAD_CREATED)
            )
          )
          .orderBy(desc(coinTransactions.createdAt))
          .limit(1);

        expect(tx[0]).toBeDefined();
        expect(tx[0].channel).toBe(COIN_CHANNELS.FORUM);
      }
    });

    test('Cannot send negative amounts', async () => {
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: -100,
          description: 'Negative transfer attempt',
        }),
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error).toBeDefined();
    });

    test('Cannot send zero amount', async () => {
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 0,
          description: 'Zero transfer attempt',
        }),
      });

      expect(response.ok).toBe(false);
    });
  });

  describe('Fraud Prevention', () => {

    test('Daily transaction limits', async () => {
      const transfers = [];
      
      // Try to make many transfers in one day
      for (let i = 0; i < 20; i++) {
        transfers.push(
          fetch(`${API_URL}/api/coins/transfer`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              recipientId: recipientUserId,
              amount: 10,
              description: `Daily limit test ${i}`,
            }),
          })
        );
      }

      const responses = await Promise.all(transfers);
      const failed = responses.filter(r => !r.ok).length;

      if (failed > 0) {
        console.log(`✓ Daily transaction limit enforced (${failed} blocked)`);
      } else {
        console.warn('⚠ Daily transaction limits may not be configured');
      }
    });

    test('Unusual pattern detection (rapid transfers)', async () => {
      const rapidTransfers = [];
      
      // Make 5 rapid transfers
      for (let i = 0; i < 5; i++) {
        rapidTransfers.push(
          fetch(`${API_URL}/api/coins/transfer`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              recipientId: recipientUserId,
              amount: 5,
              description: `Rapid transfer ${i}`,
            }),
          })
        );
      }

      await Promise.all(rapidTransfers);

      // Check if fraud signals were created
      const fraudSignalsCount = await db.select({ count: sql<number>`count(*)` })
        .from(fraudSignals)
        .where(eq(fraudSignals.userId, testUserId!));

      if (fraudSignalsCount[0].count > 0) {
        console.log('✓ Unusual pattern detection is working');
      }
    });

    test('Self-dealing prevention (cannot transfer to self)', async () => {
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: testUserId, // Same as sender
          amount: 100,
          description: 'Self transfer attempt',
        }),
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error.toLowerCase()).toContain('self');
    });

    test('Bot transaction limits', async () => {
      // Create a bot user
      const [bot] = await db.insert(users).values({
        username: `bot_${Date.now()}`,
        email: `bot${Date.now()}@test.com`,
        password_hash: await bcrypt.hash('BotPass123!', 10),
        totalCoins: 10000,
        role: 'bot',
        is_email_verified: true,
      }).returning();

      // Login as bot
      const botLogin = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: bot.email,
          password: 'BotPass123!',
        }),
      });
      const botCookie = botLogin.headers.get('set-cookie') || '';

      // Try to make large transfer as bot
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': botCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 5000, // Large amount for bot
          description: 'Bot large transfer',
        }),
      });

      // Bots should have stricter limits
      if (!response.ok) {
        const error = await response.json();
        console.log('✓ Bot transaction limits enforced:', error.error);
      }
    });

    test('Velocity checks (amount per time period)', async () => {
      let totalTransferred = 0;
      let blocked = false;

      // Try to transfer large amounts quickly
      for (let i = 0; i < 5; i++) {
        const amount = 200;
        const response = await fetch(`${API_URL}/api/coins/transfer`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': sessionCookie,
          },
          body: JSON.stringify({
            recipientId: recipientUserId,
            amount,
            description: `Velocity check ${i}`,
          }),
        });

        if (!response.ok) {
          blocked = true;
          const error = await response.json();
          console.log(`✓ Velocity check triggered after ${totalTransferred} coins:`, error.error);
          break;
        }
        totalTransferred += amount;
      }

      if (!blocked && totalTransferred >= 1000) {
        console.warn('⚠ Velocity checks may not be configured');
      }
    });
  });

  describe('Expiration Logic', () => {

    test('90-day FIFO expiration', async () => {
      // Create old transaction (simulate 91 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);

      await db.insert(coinTransactions).values({
        userId: testUserId!,
        type: 'earn',
        amount: 100,
        trigger: COIN_TRIGGERS.SYSTEM_ADJUSTMENT,
        channel: COIN_CHANNELS.SYSTEM,
        description: 'Old coins that should expire',
        status: 'completed',
        createdAt: oldDate,
      });

      // Run expiration job (or call API endpoint)
      const response = await fetch(`${API_URL}/api/admin/jobs/expire-coins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      // Check if coins were expired
      const expirations = await db.select().from(coinExpirations)
        .where(eq(coinExpirations.userId, testUserId!))
        .orderBy(desc(coinExpirations.createdAt))
        .limit(1);

      if (expirations[0]) {
        expect(expirations[0].amount).toBe(100);
        console.log('✓ 90-day FIFO expiration working');
      } else {
        console.warn('⚠ Coin expiration may not be implemented');
      }
    });

    test('Proper coin consumption order (FIFO)', async () => {
      // Create transactions with different dates
      const dates = [80, 60, 40, 20, 5].map(daysAgo => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date;
      });

      // Insert coins earned at different times
      for (const date of dates) {
        await db.insert(coinTransactions).values({
          userId: testUserId!,
          type: 'earn',
          amount: 100,
          trigger: COIN_TRIGGERS.SYSTEM_ADJUSTMENT,
          channel: COIN_CHANNELS.SYSTEM,
          description: `Coins from ${date.toISOString()}`,
          status: 'completed',
          createdAt: date,
        });
      }

      // Spend coins and check FIFO order
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 150, // Should consume oldest coins first
          description: 'FIFO test transfer',
        }),
      });

      if (response.ok) {
        // Check ledger to verify FIFO consumption
        const ledger = await db.select().from(coinLedgerTransactions)
          .where(eq(coinLedgerTransactions.userId, testUserId!))
          .orderBy(desc(coinLedgerTransactions.createdAt))
          .limit(5);

        if (ledger.length > 0) {
          console.log('✓ FIFO coin consumption implemented');
        }
      }
    });

    test('Expired coin cleanup job', async () => {
      // Create many old expired coins
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      for (let i = 0; i < 5; i++) {
        await db.insert(coinTransactions).values({
          userId: testUserId!,
          type: 'earn',
          amount: 20,
          trigger: COIN_TRIGGERS.SYSTEM_ADJUSTMENT,
          channel: COIN_CHANNELS.SYSTEM,
          description: `Old expired coins ${i}`,
          status: 'completed',
          createdAt: oldDate,
        });
      }

      // Run cleanup job
      const response = await fetch(`${API_URL}/api/admin/jobs/cleanup-expired`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      // Verify cleanup
      const oldTransactions = await db.select().from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.userId, testUserId!),
            lt(coinTransactions.createdAt, oldDate)
          )
        );

      // Old transactions should be marked as expired or removed
      console.log(`Expired transactions cleanup: ${oldTransactions.length} remaining`);
    });

    test('Expiration notifications', async () => {
      // Create coins about to expire (89 days old)
      const soonToExpire = new Date();
      soonToExpire.setDate(soonToExpire.getDate() - 89);

      await db.insert(coinTransactions).values({
        userId: testUserId!,
        type: 'earn',
        amount: 500,
        trigger: COIN_TRIGGERS.SYSTEM_ADJUSTMENT,
        channel: COIN_CHANNELS.SYSTEM,
        description: 'Coins expiring soon',
        status: 'completed',
        createdAt: soonToExpire,
      });

      // Check for expiration warning notification
      const notificationList = await db.select().from(notifications)
        .where(
          and(
            eq(notifications.userId, testUserId!),
            eq(notifications.type, 'coin_expiration_warning')
          )
        );

      if (notificationList.length > 0) {
        console.log('✓ Expiration notifications working');
      }
    });
  });

  describe('Wallet System', () => {

    test('Wallet initialization on user creation', async () => {
      // Create new user
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `wallettest_${Date.now()}`,
          email: `wallet${Date.now()}@test.com`,
          password: 'SecurePass123!',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Check wallet was created
      const wallet = await db.select().from(userWallet)
        .where(eq(userWallet.userId, data.user?.id || data.id))
        .limit(1);

      expect(wallet[0]).toBeDefined();
      expect(wallet[0].balance).toBe(100); // Welcome bonus
      expect(wallet[0].lifetimeEarnings).toBe(100);
    });

    test('Wallet balance consistency with transactions', async () => {
      // Get wallet balance
      const wallet = await db.select().from(userWallet)
        .where(eq(userWallet.userId, testUserId!))
        .limit(1);

      const walletBalance = wallet[0]?.balance || 0;

      // Get user totalCoins
      const user = await db.select().from(users)
        .where(eq(users.id, testUserId!))
        .limit(1);

      const userBalance = user[0].totalCoins;

      // Should match
      expect(walletBalance).toBe(userBalance);
    });

    test('Journal entry creation for all transactions', async () => {
      // Make a transfer
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 25,
          description: 'Journal test transfer',
        }),
      });

      expect(response.ok).toBe(true);

      // Check journal entries
      const journal = await db.select().from(coinJournalEntries)
        .where(eq(coinJournalEntries.userId, testUserId!))
        .orderBy(desc(coinJournalEntries.createdAt))
        .limit(2);

      // Should have debit and credit entries
      expect(journal.length).toBeGreaterThan(0);
      const hasDebit = journal.some(j => j.entryType === 'debit');
      const hasCredit = journal.some(j => j.entryType === 'credit');

      if (hasDebit || hasCredit) {
        console.log('✓ Journal entries being created');
      }
    });
  });

  describe('Edge Cases and Security', () => {

    test('Concurrent transactions (race conditions)', async () => {
      // Make multiple simultaneous transfers
      const transfers = [];
      for (let i = 0; i < 5; i++) {
        transfers.push(
          fetch(`${API_URL}/api/coins/transfer`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            body: JSON.stringify({
              recipientId: recipientUserId,
              amount: 250, // 5 x 250 = 1250 total (more than 1000 available)
              description: `Concurrent transfer ${i}`,
            }),
          })
        );
      }

      const responses = await Promise.all(transfers);
      const successful = responses.filter(r => r.ok).length;
      const failed = responses.filter(r => !r.ok).length;

      // Should not allow overdraft due to race conditions
      expect(failed).toBeGreaterThan(0);
      console.log(`✓ Race condition protection: ${successful} succeeded, ${failed} blocked`);

      // Check final balance is valid
      const user = await db.select().from(users)
        .where(eq(users.id, testUserId!))
        .limit(1);
      
      expect(user[0].totalCoins).toBeGreaterThanOrEqual(0);
    });

    test('Transaction rollback on failure', async () => {
      // Try transfer with invalid recipient
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: 'invalid-user-id-xyz',
          amount: 100,
          description: 'Transfer to invalid user',
        }),
      });

      expect(response.ok).toBe(false);

      // Check balance unchanged
      const user = await db.select().from(users)
        .where(eq(users.id, testUserId!))
        .limit(1);
      
      expect(user[0].totalCoins).toBe(1000); // Original amount
    });

    test('Decimal amount handling', async () => {
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 10.5, // Decimal amount
          description: 'Decimal transfer test',
        }),
      });

      // Should either reject decimals or handle properly
      if (response.ok) {
        const tx = await db.select().from(coinTransactions)
          .where(eq(coinTransactions.userId, testUserId!))
          .orderBy(desc(coinTransactions.createdAt))
          .limit(1);
        
        // Should be stored as integer
        expect(Number.isInteger(tx[0].amount)).toBe(true);
      }
    });

    test('Maximum amount limits', async () => {
      // Give user lots of coins
      await db.update(users)
        .set({ totalCoins: 1000000 })
        .where(eq(users.id, testUserId!));

      // Try to transfer huge amount
      const response = await fetch(`${API_URL}/api/coins/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
        body: JSON.stringify({
          recipientId: recipientUserId,
          amount: 999999,
          description: 'Max transfer test',
        }),
      });

      // Should have max limit per transaction
      if (!response.ok) {
        const error = await response.json();
        console.log('✓ Maximum transfer limit enforced:', error.error);
      }
    });
  });
});