import { storage } from '../storage/index.js';
import { emailQueueService, EmailPriority } from '../services/emailQueue.js';
import { db } from '../db.js';
import { userWallet, coinJournalEntries, users } from '../../shared/schema.js';
import { eq, sql, and, gte } from 'drizzle-orm';

/**
 * Coin Health Monitor Automation
 * Runs daily at 07:00 (after treasurySnapshot) to monitor wallet discrepancies
 * 
 * Process:
 * 1. Fetch latest treasury snapshot
 * 2. Calculate 24h deltas
 * 3. Query wallet-transaction discrepancies
 * 4. Create alerts for drift violations
 * 5. Email admin digest
 * 6. Create monitoring run record
 */

const DRIFT_ALERT_THRESHOLDS = {
  MEDIUM: 1,      // Alert if drift > 1 coin
  HIGH: 100,      // Alert if drift > 100 coins
  CRITICAL: 1000  // Alert if drift > 1000 coins + fraud signal
};

export async function runCoinHealthMonitor(): Promise<{
  totalDrift: number;
  usersAffected: number;
  alertsCreated: number;
}> {
  const startTime = Date.now();
  console.log('[COIN HEALTH] Starting coin health monitor job...');

  let totalDrift = 0;
  let usersAffected = 0;
  let alertsCreated = 0;
  const now = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const discrepancies: Array<{
    userId: string;
    username: string;
    walletBalance: number;
    journalBalance: number;
    drift: number;
  }> = [];

  // Create monitoring run record
  const monitoringRun = await storage.createMonitoringRun({
    jobName: 'coin_health',
    status: 'running',
    startedAt: now,
    metadata: {
      thresholds: DRIFT_ALERT_THRESHOLDS
    }
  });

  try {
    // 1. Fetch latest treasury snapshot
    const latestSnapshot = await storage.getLatestTreasurySnapshot();
    console.log('[COIN HEALTH] Latest treasury snapshot:', latestSnapshot ? `${latestSnapshot.totalBalance} coins` : 'none');

    // 2. Query wallet-transaction discrepancies
    const allWallets = await db.select().from(userWallet);
    console.log(`[COIN HEALTH] Checking ${allWallets.length} user wallets...`);

    for (const wallet of allWallets) {
      try {
        // Calculate expected balance from journal entries
        const journalSum = await db
          .select({
            total: sql<number>`COALESCE(SUM(
              CASE 
                WHEN ${coinJournalEntries.direction} = 'debit' THEN -${coinJournalEntries.amount}
                WHEN ${coinJournalEntries.direction} = 'credit' THEN ${coinJournalEntries.amount}
                ELSE 0
              END
            ), 0)`.as('total')
          })
          .from(coinJournalEntries)
          .where(eq(coinJournalEntries.walletId, wallet.walletId));

        const expectedBalance = journalSum[0]?.total || 0;
        const actualBalance = wallet.balance;
        const drift = Math.abs(actualBalance - expectedBalance);

        // Check for discrepancies
        if (drift > DRIFT_ALERT_THRESHOLDS.MEDIUM) {
          // Get user details
          const user = await storage.getUser(wallet.userId);
          const username = user?.username || 'Unknown';

          discrepancies.push({
            userId: wallet.userId,
            username,
            walletBalance: actualBalance,
            journalBalance: expectedBalance,
            drift
          });

          usersAffected++;
          totalDrift += drift;

          // Store metric
          await storage.createMonitoringMetric({
            metricType: 'coin_balance_drift',
            metricValue: drift.toString(),
            component: 'wallet',
            metadata: {
              userId: wallet.userId,
              walletBalance: actualBalance,
              journalBalance: expectedBalance,
              drift
            }
          });

          // Create alerts based on severity
          if (drift > DRIFT_ALERT_THRESHOLDS.CRITICAL) {
            // Critical: Create alert + fraud signal
            await storage.createMonitoringAlert({
              alertType: 'wallet_discrepancy',
              severity: 'critical',
              message: `CRITICAL wallet discrepancy for user ${username}: drift of ${drift} coins (wallet=${actualBalance}, journal=${expectedBalance})`,
              affectedEntities: {
                userIds: [wallet.userId]
              }
            });

            await storage.createFraudSignal(
              wallet.userId,
              'suspicious_pattern',
              'high',
              {
                type: 'wallet_discrepancy',
                walletBalance: actualBalance,
                journalBalance: expectedBalance,
                drift,
                detectedAt: now.toISOString(),
                requiresInvestigation: true
              }
            );

            alertsCreated++;
            console.warn(`[COIN HEALTH] 🚨 CRITICAL: User ${username} has ${drift} coin drift (wallet=${actualBalance}, journal=${expectedBalance})`);
          } else if (drift > DRIFT_ALERT_THRESHOLDS.HIGH) {
            // High: Create alert
            await storage.createMonitoringAlert({
              alertType: 'wallet_discrepancy',
              severity: 'high',
              message: `High wallet discrepancy for user ${username}: drift of ${drift} coins (wallet=${actualBalance}, journal=${expectedBalance})`,
              affectedEntities: {
                userIds: [wallet.userId]
              }
            });

            alertsCreated++;
            console.warn(`[COIN HEALTH] ⚠️  HIGH: User ${username} has ${drift} coin drift`);
          } else {
            // Medium: Create alert
            await storage.createMonitoringAlert({
              alertType: 'wallet_discrepancy',
              severity: 'medium',
              message: `Wallet discrepancy for user ${username}: drift of ${drift} coins (wallet=${actualBalance}, journal=${expectedBalance})`,
              affectedEntities: {
                userIds: [wallet.userId]
              }
            });

            alertsCreated++;
          }
        }
      } catch (error) {
        console.error(`[COIN HEALTH] Error checking wallet ${wallet.userId}:`, error);
      }
    }

    // 3. Email digest to admins
    if (discrepancies.length > 0) {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(5);

      for (const admin of adminUsers) {
        if (admin.email) {
          await emailQueueService.queueEmail({
            userId: admin.id,
            templateKey: 'coin_health_report',
            recipientEmail: admin.email,
            subject: `💰 Coin Health Report: ${usersAffected} Users with Discrepancies`,
            payload: {
              adminUsername: admin.username,
              usersAffected,
              totalDrift,
              alertsCreated,
              topDiscrepancies: discrepancies.slice(0, 10),
              reportDate: now.toISOString(),
              dashboardUrl: '/admin/economy'
            },
            priority: alertsCreated > 10 ? EmailPriority.HIGH : EmailPriority.MEDIUM
          });
        }
      }
    }

    // Update monitoring run as completed
    await storage.updateMonitoringRun(monitoringRun.id, {
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        totalDrift,
        usersAffected,
        alertsCreated,
        discrepancies: discrepancies.length,
        duration: Date.now() - startTime
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[COIN HEALTH] Job completed in ${duration}ms: ${usersAffected} users affected, ${totalDrift} total drift, ${alertsCreated} alerts created`);

    return {
      totalDrift,
      usersAffected,
      alertsCreated
    };
  } catch (error) {
    console.error('[COIN HEALTH] Fatal error in coin health monitor job:', error);
    
    // Update monitoring run as failed
    await storage.updateMonitoringRun(monitoringRun.id, {
      status: 'failed',
      completedAt: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalDrift,
        usersAffected,
        alertsCreated
      }
    });
    
    throw error;
  }
}
