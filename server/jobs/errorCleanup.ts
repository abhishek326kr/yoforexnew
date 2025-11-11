import { storage } from '../storage/index.js';
import { emailQueueService, EmailPriority } from '../services/emailQueue.js';
import { db } from '../db.js';
import { errorGroups, errorEvents } from '../../shared/schema.js';
import { eq, and, lte, gte, sql, inArray } from 'drizzle-orm';

/**
 * Error Cleanup Automation
 * Runs daily at 02:30 to archive old resolved errors and free up database space
 * 
 * Process:
 * 1. Find resolved error groups older than 30 days
 * 2. Skip groups with recent activity (events in last 7 days)
 * 3. Archive groups to error_archives table
 * 4. Delete original events and groups
 * 5. Create monitoring run record
 * 6. Alert if unusual deletion volume
 */

const ARCHIVE_AGE_DAYS = 30; // Archive errors resolved 30+ days ago
const RECENT_ACTIVITY_DAYS = 7; // Skip if events within last 7 days
const BATCH_SIZE = 100; // Process in batches
const ALERT_THRESHOLD = 1000; // Alert if >1000 events deleted

export async function runErrorCleanup(): Promise<{
  deletedGroups: number;
  archivedEvents: number;
  errors: number;
}> {
  const startTime = Date.now();
  console.log('[ERROR CLEANUP] Starting error cleanup job...');

  let deletedGroups = 0;
  let archivedEvents = 0;
  let errors = 0;
  const now = new Date();
  const archiveDate = new Date(Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);
  const recentActivityDate = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  // Create monitoring run record
  const monitoringRun = await storage.createMonitoringRun({
    jobName: 'error_cleanup',
    status: 'running',
    startedAt: now,
    metadata: {
      archiveAge: ARCHIVE_AGE_DAYS,
      recentActivityDays: RECENT_ACTIVITY_DAYS,
      batchSize: BATCH_SIZE
    }
  });

  try {
    // Find resolved error groups older than 30 days
    const candidateGroups = await db
      .select()
      .from(errorGroups)
      .where(
        and(
          eq(errorGroups.status, 'resolved'),
          lte(errorGroups.resolvedAt, archiveDate)
        )
      )
      .orderBy(errorGroups.resolvedAt);

    console.log(`[ERROR CLEANUP] Found ${candidateGroups.length} resolved groups older than ${ARCHIVE_AGE_DAYS} days`);

    if (candidateGroups.length === 0) {
      console.log('[ERROR CLEANUP] No groups to archive. Exiting.');
      
      // Update monitoring run as completed
      await storage.updateMonitoringRun(monitoringRun.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          deletedGroups: 0,
          archivedEvents: 0,
          errors: 0,
          duration: Date.now() - startTime
        }
      });
      
      return { deletedGroups: 0, archivedEvents: 0, errors: 0 };
    }

    // Filter out groups with recent activity (batch query to avoid N+1)
    const groupIds = candidateGroups.map(g => g.id);
    
    // Batch query: count recent events per group
    const recentEventCounts = await db
      .select({
        groupId: errorEvents.groupId,
        count: sql<number>`COUNT(*)::int`.as('count')
      })
      .from(errorEvents)
      .where(
        and(
          inArray(errorEvents.groupId, groupIds),
          gte(errorEvents.createdAt, recentActivityDate) // FIXED: Changed from lte to gte to find events WITHIN last 7 days
        )
      )
      .groupBy(errorEvents.groupId);

    // Create map of group IDs with recent activity
    const groupsWithActivity = new Set(recentEventCounts.map(r => r.groupId));

    // Filter out groups that have recent activity
    const groupsToArchive = [];
    for (const group of candidateGroups) {
      if (!groupsWithActivity.has(group.id)) {
        groupsToArchive.push(group);
      } else {
        const count = recentEventCounts.find(r => r.groupId === group.id)?.count || 0;
        console.log(`[ERROR CLEANUP] Skipping group ${group.id}: has ${count} events in last ${RECENT_ACTIVITY_DAYS} days`);
      }
    }

    console.log(`[ERROR CLEANUP] ${groupsToArchive.length} groups eligible for archival after activity check`);

    // Process in batches
    const batches = [];
    for (let i = 0; i < groupsToArchive.length; i += BATCH_SIZE) {
      batches.push(groupsToArchive.slice(i, i + BATCH_SIZE));
    }

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`[ERROR CLEANUP] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} groups)...`);

      try {
        const groupIdsToArchive = batch.map(g => g.id);
        
        // Use storage.archiveErrorGroups which handles everything in a transaction
        // This ensures referential integrity by deleting events before groups
        const result = await storage.archiveErrorGroups(groupIdsToArchive);
        
        deletedGroups += result.archived;
        archivedEvents += result.events;

        console.log(`[ERROR CLEANUP] Archived ${result.archived} groups with ${result.events} events in transaction`);
      } catch (error) {
        console.error(`[ERROR CLEANUP] Error processing batch ${batchIndex + 1}:`, error);
        errors++;
      }
    }

    // Create metrics
    await storage.createMonitoringMetric({
      metricType: 'db_size',
      metricValue: deletedGroups.toString(),
      component: 'error_groups',
      metadata: {
        deletedGroups,
        archivedEvents,
        archiveDate: archiveDate.toISOString()
      }
    });

    // Alert if unusual deletion volume
    if (archivedEvents > ALERT_THRESHOLD) {
      await storage.createMonitoringAlert({
        alertType: 'disk_space',
        severity: 'medium',
        message: `Error cleanup archived ${deletedGroups} groups with ${archivedEvents} events (exceeds ${ALERT_THRESHOLD} threshold)`,
        affectedEntities: {
          deletedGroups,
          archivedEvents
        }
      });

      console.warn(`[ERROR CLEANUP] ⚠️  HIGH VOLUME: Archived ${archivedEvents} events (threshold: ${ALERT_THRESHOLD})`);
    }

    // Update monitoring run as completed
    await storage.updateMonitoringRun(monitoringRun.id, {
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        deletedGroups,
        archivedEvents,
        errors,
        duration: Date.now() - startTime
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[ERROR CLEANUP] Job completed in ${duration}ms: ${deletedGroups} groups, ${archivedEvents} events archived, ${errors} errors`);

    return {
      deletedGroups,
      archivedEvents,
      errors
    };
  } catch (error) {
    console.error('[ERROR CLEANUP] Fatal error in error cleanup job:', error);
    
    // Update monitoring run as failed
    await storage.updateMonitoringRun(monitoringRun.id, {
      status: 'failed',
      completedAt: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        deletedGroups,
        archivedEvents,
        errors
      }
    });
    
    throw error;
  }
}
