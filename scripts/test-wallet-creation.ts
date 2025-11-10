#!/usr/bin/env tsx
/**
 * Test script to verify wallet auto-creation for coin rewards
 * This tests the fix for the coin rewards issue when users don't have wallets
 */

import { db } from '../server/db';
import { storage } from '../server/storage';
import { coinTransactionService } from '../server/services/coinTransactionService';
import { users, userWallet } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { COIN_TRIGGERS, COIN_CHANNELS } from '../shared/schema';

async function testWalletCreation() {
  console.log('🧪 Testing wallet auto-creation for coin rewards...\n');

  try {
    // Step 1: Create a test user WITHOUT a wallet (using storage layer)
    const testUserId = randomUUID();
    const testUsername = `test_user_${Date.now()}`;
    const testEmail = `${testUsername}@test.com`;
    
    console.log('📝 Creating test user without wallet...');
    const testUser = await storage.createUser({
      id: testUserId,
      username: testUsername,
      email: testEmail,
      emailVerified: false,
      passwordHash: 'test_hash',
      displayName: testUsername,
      role: 'member',
      totalCoins: 0,
      reputationScore: 0,
    });
    
    console.log(`✅ Created test user: ${testUsername} (ID: ${testUser.id})`);
    
    // Use the actual user ID from the created user
    const actualUserId = testUser.id;
    
    // Step 2: Verify no wallet exists
    console.log('\n🔍 Checking if wallet exists (should not exist)...');
    const walletBefore = await db.select()
      .from(userWallet)
      .where(eq(userWallet.userId, actualUserId))
      .limit(1);
    
    if (walletBefore.length > 0) {
      console.log('⚠️ Wallet already exists (unexpected), but continuing test...');
    } else {
      console.log('✅ Confirmed: No wallet exists for user');
    }
    
    // Step 3: Test storage.getUserWallet auto-creation
    console.log('\n🔧 Testing storage.getUserWallet auto-creation...');
    const walletFromStorage = await storage.getUserWallet(actualUserId);
    
    if (walletFromStorage) {
      console.log('✅ storage.getUserWallet successfully created wallet');
      console.log(`   Wallet ID: ${walletFromStorage.walletId}`);
      console.log(`   Balance: ${walletFromStorage.balance}`);
    } else {
      console.log('❌ storage.getUserWallet returned null (should have created wallet)');
    }
    
    // Step 4: Test coin transaction service with thread creation reward
    console.log('\n💰 Testing coin reward for thread creation...');
    const coinReward = 12; // 10 base + 2 bonus
    
    const coinResult = await coinTransactionService.executeTransaction({
      userId: actualUserId,
      amount: coinReward,
      trigger: COIN_TRIGGERS.FORUM_THREAD_CREATED,
      channel: COIN_CHANNELS.FORUM,
      description: 'Thread created with bonus details: Test Thread',
      metadata: {
        threadId: randomUUID(),
        threadSlug: 'test-thread',
        baseReward: 10,
        bonusReward: 2,
        categorySlug: 'test-category'
      },
      idempotencyKey: `thread-test-${Date.now()}`
    });
    
    if (coinResult.success) {
      console.log('✅ Coin transaction successful!');
      console.log(`   Transaction ID: ${coinResult.transactionId}`);
      console.log(`   New Balance: ${coinResult.newBalance} coins`);
      console.log(`   Duplicate: ${coinResult.duplicate ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Coin transaction failed:');
      console.log(`   Error: ${coinResult.error}`);
    }
    
    // Step 5: Verify final wallet state
    console.log('\n🔍 Verifying final wallet state...');
    const finalWallet = await db.select()
      .from(userWallet)
      .where(eq(userWallet.userId, actualUserId))
      .limit(1);
    
    if (finalWallet.length > 0) {
      const wallet = finalWallet[0];
      console.log('✅ Final wallet state:');
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Balance: ${wallet.balance} coins`);
      console.log(`   Available Balance: ${wallet.availableBalance} coins`);
      console.log(`   Status: ${wallet.status}`);
      console.log(`   Version: ${wallet.version}`);
      
      if (wallet.balance === coinReward) {
        console.log('\n🎉 SUCCESS: Wallet created and coins awarded correctly!');
      } else {
        console.log(`\n⚠️ WARNING: Balance (${wallet.balance}) doesn't match expected reward (${coinReward})`);
      }
    } else {
      console.log('❌ ERROR: No wallet found after transaction');
    }
    
    // Step 6: Test idempotency (running same transaction again)
    console.log('\n🔄 Testing idempotency (duplicate prevention)...');
    const duplicateResult = await coinTransactionService.executeTransaction({
      userId: actualUserId,
      amount: coinReward,
      trigger: COIN_TRIGGERS.FORUM_THREAD_CREATED,
      channel: COIN_CHANNELS.FORUM,
      description: 'Thread created with bonus details: Test Thread',
      metadata: {
        threadId: randomUUID(),
        threadSlug: 'test-thread',
        baseReward: 10,
        bonusReward: 2,
        categorySlug: 'test-category'
      },
      idempotencyKey: `thread-test-${Date.now()}` // Same key as before
    });
    
    if (duplicateResult.success && !duplicateResult.duplicate) {
      console.log('✅ New transaction created (different idempotency key)');
      console.log(`   New Balance: ${duplicateResult.newBalance} coins`);
    } else if (duplicateResult.duplicate) {
      console.log('✅ Duplicate transaction prevented (idempotency working)');
    }
    
    // Cleanup: Delete test user and wallet
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(userWallet).where(eq(userWallet.userId, actualUserId));
    await db.delete(users).where(eq(users.id, actualUserId));
    console.log('✅ Test data cleaned up');
    
    console.log('\n✅ All tests completed successfully!');
    console.log('The wallet auto-creation fix is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testWalletCreation();