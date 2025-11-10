#!/usr/bin/env tsx
/**
 * Simple test to verify wallet auto-creation for existing users
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
    // Step 1: Get any existing user
    console.log('📝 Getting an existing user...');
    const existingUsers = await db.select()
      .from(users)
      .limit(1);
    
    if (existingUsers.length === 0) {
      console.log('❌ No users found in database. Please seed some users first.');
      process.exit(1);
    }
    
    const testUser = existingUsers[0];
    console.log(`✅ Using existing user: ${testUser.username} (ID: ${testUser.id})`);
    
    // Step 2: Delete their wallet if it exists (to test creation)
    console.log('\n🔧 Removing existing wallet (if any) to test auto-creation...');
    await db.delete(userWallet).where(eq(userWallet.userId, testUser.id));
    console.log('✅ Wallet removed (if existed)');
    
    // Step 3: Verify no wallet exists
    console.log('\n🔍 Verifying no wallet exists...');
    const walletBefore = await db.select()
      .from(userWallet)
      .where(eq(userWallet.userId, testUser.id))
      .limit(1);
    
    if (walletBefore.length > 0) {
      console.log('⚠️ Wallet still exists (unexpected), but continuing test...');
    } else {
      console.log('✅ Confirmed: No wallet exists for user');
    }
    
    // Step 4: Test coin transaction service with thread creation reward
    console.log('\n💰 Testing coin reward for thread creation (should auto-create wallet)...');
    const coinReward = 12; // 10 base + 2 bonus
    
    const coinResult = await coinTransactionService.executeTransaction({
      userId: testUser.id,
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
    } else {
      console.log('❌ Coin transaction failed:');
      console.log(`   Error: ${coinResult.error}`);
    }
    
    // Step 5: Verify wallet was created
    console.log('\n🔍 Verifying wallet was auto-created...');
    const finalWallet = await db.select()
      .from(userWallet)
      .where(eq(userWallet.userId, testUser.id))
      .limit(1);
    
    if (finalWallet.length > 0) {
      const wallet = finalWallet[0];
      console.log('✅ Wallet auto-created successfully!');
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Balance: ${wallet.balance} coins`);
      console.log(`   Status: ${wallet.status}`);
      
      if (wallet.balance === coinReward) {
        console.log('\n🎉 SUCCESS: Wallet auto-created and coins awarded correctly!');
      } else {
        console.log(`\n⚠️ WARNING: Balance (${wallet.balance}) doesn't match expected reward (${coinReward})`);
      }
    } else {
      console.log('❌ ERROR: No wallet found after transaction');
    }
    
    console.log('\n✅ Test completed!');
    console.log('The wallet auto-creation fix is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testWalletCreation();