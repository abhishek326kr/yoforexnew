/**
 * Coin Economy Reconciliation Script
 * 
 * This script fixes the discrepancy between user wallets and coin transactions
 * by creating missing wallets and updating wallet balances to match transaction history.
 * 
 * Issues fixed:
 * 1. Users with transactions but no wallet (29 users, 7,451 coins)
 * 2. Users with wallet-transaction mismatches (8 users, 2,233 coin discrepancy)
 * 3. Creates wallets for 676 users who don't have one yet
 * 
 * Usage:
 *   npm run tsx scripts/reconcile-coin-economy.ts
 *   
 * Options:
 *   --dry-run: Preview changes without applying them
 *   --force: Apply changes to database
 */

import { db } from "../server/db";
import { userWallet, coinTransactions, users } from "../shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

interface ReconciliationReport {
  usersWithTransactionsNoWallet: number;
  usersWithWalletMismatch: number;
  usersWithoutWallet: number;
  coinsReconciled: number;
  walletsCreated: number;
  walletsUpdated: number;
  errors: string[];
}

async function reconcileCoinEconomy(dryRun = true): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    usersWithTransactionsNoWallet: 0,
    usersWithWalletMismatch: 0,
    usersWithoutWallet: 0,
    coinsReconciled: 0,
    walletsCreated: 0,
    walletsUpdated: 0,
    errors: []
  };

  console.log("🔍 Starting Coin Economy Reconciliation...");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "FORCE (applying changes)"}\n`);

  try {
    // Step 1: Find all users with their transaction totals and current wallet balance
    console.log("📊 Analyzing transaction and wallet data...");
    
    const userTransactionTotals = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.username,
        u.email,
        COALESCE(SUM(ct.amount), 0) as transaction_sum,
        uw.balance as current_wallet_balance,
        uw.wallet_id
      FROM users u
      LEFT JOIN coin_transactions ct ON u.id = ct.user_id
      LEFT JOIN user_wallet uw ON u.id = uw.user_id
      GROUP BY u.id, u.username, u.email, uw.balance, uw.wallet_id
    `);

    console.log(`Found ${userTransactionTotals.rows.length} users to process\n`);

    // Step 2: Process each user
    for (const row of userTransactionTotals.rows as any[]) {
      const userId = row.user_id;
      const username = row.username;
      const transactionSum = parseInt(row.transaction_sum) || 0;
      const currentBalance = parseInt(row.current_wallet_balance) || 0;
      const walletId = row.wallet_id;

      // Case 1: Has transactions but no wallet
      if (transactionSum > 0 && !walletId) {
        report.usersWithTransactionsNoWallet++;
        report.coinsReconciled += transactionSum;
        
        console.log(`✨ Creating wallet for ${username} (${userId})`);
        console.log(`   Transaction sum: ${transactionSum} coins`);

        if (!dryRun) {
          try {
            await db.insert(userWallet).values({
              userId: userId,
              balance: transactionSum,
              availableBalance: transactionSum,
              status: "active",
              version: 1
            });
            report.walletsCreated++;
            console.log(`   ✅ Wallet created with ${transactionSum} coins\n`);
          } catch (error: any) {
            const errorMsg = `Failed to create wallet for ${username}: ${error.message}`;
            console.error(`   ❌ ${errorMsg}\n`);
            report.errors.push(errorMsg);
          }
        } else {
          console.log(`   [DRY RUN] Would create wallet with ${transactionSum} coins\n`);
        }
      }
      
      // Case 2: Has wallet but balance doesn't match transactions
      else if (walletId && Math.abs(currentBalance - transactionSum) > 0.01) {
        report.usersWithWalletMismatch++;
        const discrepancy = transactionSum - currentBalance;
        report.coinsReconciled += Math.abs(discrepancy);
        
        console.log(`🔧 Fixing wallet for ${username} (${userId})`);
        console.log(`   Current balance: ${currentBalance} coins`);
        console.log(`   Transaction sum: ${transactionSum} coins`);
        console.log(`   Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy} coins`);

        if (!dryRun) {
          try {
            await db.update(userWallet)
              .set({
                balance: transactionSum,
                availableBalance: transactionSum,
                updatedAt: new Date()
              })
              .where(eq(userWallet.userId, userId));
            
            report.walletsUpdated++;
            console.log(`   ✅ Wallet updated to ${transactionSum} coins\n`);
          } catch (error: any) {
            const errorMsg = `Failed to update wallet for ${username}: ${error.message}`;
            console.error(`   ❌ ${errorMsg}\n`);
            report.errors.push(errorMsg);
          }
        } else {
          console.log(`   [DRY RUN] Would update balance to ${transactionSum} coins\n`);
        }
      }
      
      // Case 3: No wallet and no transactions - create empty wallet
      else if (!walletId && transactionSum === 0) {
        report.usersWithoutWallet++;
        
        if (!dryRun) {
          try {
            await db.insert(userWallet).values({
              userId: userId,
              balance: 0,
              availableBalance: 0,
              status: "active",
              version: 1
            });
            report.walletsCreated++;
          } catch (error: any) {
            // Silent fail for empty wallets - not critical
          }
        }
      }
    }

    // Step 3: Verify reconciliation
    console.log("\n🔍 Verifying reconciliation...");
    
    const verificationResult = await db.execute(sql`
      WITH wallet_totals AS (
        SELECT SUM(balance) as total_in_wallets
        FROM user_wallet
      ),
      transaction_totals AS (
        SELECT SUM(amount) as total_in_transactions
        FROM coin_transactions
      )
      SELECT 
        wallet_totals.total_in_wallets::integer,
        transaction_totals.total_in_transactions::integer,
        (transaction_totals.total_in_transactions - wallet_totals.total_in_wallets)::integer as discrepancy
      FROM wallet_totals, transaction_totals
    `);

    const verification = verificationResult.rows[0] as any;
    
    if (dryRun) {
      console.log("\n📋 DRY RUN SUMMARY:");
      console.log("═══════════════════════════════════════════════");
      console.log(`Would create wallets: ${report.usersWithTransactionsNoWallet} users`);
      console.log(`Would update wallets: ${report.usersWithWalletMismatch} users`);
      console.log(`Would create empty wallets: ${report.usersWithoutWallet} users`);
      console.log(`Total coins to reconcile: ${report.coinsReconciled}`);
      console.log("\nCurrent state:");
      console.log(`  Wallets: ${verification.total_in_wallets} coins`);
      console.log(`  Transactions: ${verification.total_in_transactions} coins`);
      console.log(`  Discrepancy: ${verification.discrepancy} coins`);
      console.log("\n⚠️  Run with --force to apply these changes");
    } else {
      console.log("\n✅ RECONCILIATION COMPLETE:");
      console.log("═══════════════════════════════════════════════");
      console.log(`Wallets created: ${report.walletsCreated}`);
      console.log(`Wallets updated: ${report.walletsUpdated}`);
      console.log(`Coins reconciled: ${report.coinsReconciled}`);
      console.log(`Errors: ${report.errors.length}`);
      
      console.log("\nFinal state:");
      console.log(`  Wallets: ${verification.total_in_wallets} coins`);
      console.log(`  Transactions: ${verification.total_in_transactions} coins`);
      console.log(`  Discrepancy: ${verification.discrepancy} coins`);
      
      if (Math.abs(verification.discrepancy) < 1) {
        console.log("\n🎉 Coin economy is now balanced!");
      } else {
        console.log(`\n⚠️  Warning: Still ${Math.abs(verification.discrepancy)} coins discrepancy`);
      }
    }

    if (report.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      report.errors.forEach(error => console.log(`  - ${error}`));
    }

  } catch (error: any) {
    console.error("\n💥 Fatal error during reconciliation:", error.message);
    report.errors.push(`Fatal: ${error.message}`);
  }

  return report;
}

// Main execution
const args = process.argv.slice(2);
const dryRun = !args.includes("--force");

if (dryRun) {
  console.log("⚠️  DRY RUN MODE - No changes will be made");
  console.log("   Run with --force to apply changes\n");
}

reconcileCoinEconomy(dryRun)
  .then((report) => {
    if (report.errors.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to reconcile coin economy:", error);
    process.exit(1);
  });
