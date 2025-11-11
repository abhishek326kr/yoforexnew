import { storage } from '../storage/index.js';
import { db } from '../db.js';
import { errorEvents, errorGroups } from '../../shared/schema.js';
import { sql, gte, eq } from 'drizzle-orm';

/**
 * Error Growth Monitor Automation
 * Runs hourly to track error growth patterns and database footprint
 * 
 * Process:
 * 1. Calculate rolling window event counts (1h, 24h)
 * 2. Group by component for component-level tracking
 * 3. Compare against moving averages
 * 4. Flag growth anomalies
 * 5. Track database footprint
 * 6. Create monitoring run record
 */

const GROWTH_THRESHOLDS = {
  HOURLY_VS_AVERAGE: 2.0,  // Alert if 1h count > 200% of 24h average
  HISTORICAL_INCREASE_PERCENT: 1.5,  // Alert if current > 150% of historical average
  MINIMUM_ABSOLUTE_EVENTS: 50,  // Only alert if current count > 50 events
  DB_SIZE: 100000          // Alert if error_events table > 100k rows
};

export async function runErrorGrowthMonitor(): Promise<{
  totalEvents: number;
  growthRate: number;
  components: Record<string, number>;
  alerts: number;
}> {
  const startTime = Date.now();
  console.log('[ERROR GROWTH] Starting error growth monitor job...');

  const now = new Date();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  let totalEvents = 0;
  let growthRate = 0;
  const components: Record<string, number> = {};
  let alerts = 0;

  // Create monitoring run record
  const monitoringRun = await storage.createMonitoringRun({
    jobName: 'error_growth',
    status: 'running',
    startedAt: now,
    metadata: {
      thresholds: GROWTH_THRESHOLDS
    }
  });

  try {
    // 1. Calculate event counts
    // Last 1 hour total
    const oneHourCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(errorEvents)
      .where(gte(errorEvents.createdAt, oneHourAgo));

    const eventsLastHour = oneHourCount[0]?.count || 0;

    // Last 24 hours total
    const oneDayCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(errorEvents)
      .where(gte(errorEvents.createdAt, oneDayAgo));

    const eventsLast24h = oneDayCount[0]?.count || 0;
    totalEvents = eventsLast24h;

    // Calculate growth rate
    const hourlyAverage = eventsLast24h / 24;
    growthRate = hourlyAverage > 0 ? eventsLastHour / hourlyAverage : 0;

    console.log(`[ERROR GROWTH] Events: Last 1h=${eventsLastHour}, Last 24h=${eventsLast24h}, Growth=${growthRate.toFixed(2)}x`);

    // Store total event metrics
    await storage.createMonitoringMetric({
      metricType: 'error_event_count',
      metricValue: eventsLastHour.toString(),
      component: 'all',
      metadata: {
        period: '1h',
        count: eventsLastHour
      }
    });

    await storage.createMonitoringMetric({
      metricType: 'error_event_count',
      metricValue: eventsLast24h.toString(),
      component: 'all',
      metadata: {
        period: '24h',
        count: eventsLast24h
      }
    });

    await storage.createMonitoringMetric({
      metricType: 'growth_rate',
      metricValue: growthRate.toString(),
      component: 'all',
      metadata: {
        eventsLastHour,
        hourlyAverage,
        growthRate
      }
    });

    // 2. Group by component for component-level tracking
    // FIXED: Join with error_groups to access component field (errorEvents doesn't have component)
    
    // Last 1 hour component-level metrics
    const componentCountsHourly = await db
      .select({
        component: errorGroups.component,
        count: sql<number>`COUNT(*)::int`.as('count')
      })
      .from(errorEvents)
      .innerJoin(errorGroups, eq(errorEvents.groupId, errorGroups.id))
      .where(gte(errorEvents.createdAt, oneHourAgo))
      .groupBy(errorGroups.component)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(50);

    for (const row of componentCountsHourly) {
      const component = row.component || 'unknown';
      const count = row.count;

      // Store 1h component-level metrics
      await storage.createMonitoringMetric({
        metricType: 'error_event_count',
        metricValue: count.toString(),
        component,
        metadata: {
          period: '1h',
          count
        }
      });
    }

    // Last 24 hours component-level metrics
    const componentCountsDaily = await db
      .select({
        component: errorGroups.component,
        count: sql<number>`COUNT(*)::int`.as('count')
      })
      .from(errorEvents)
      .innerJoin(errorGroups, eq(errorEvents.groupId, errorGroups.id))
      .where(gte(errorEvents.createdAt, oneDayAgo))
      .groupBy(errorGroups.component)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(50);

    // Fetch historical metrics for the last 7 days to establish baselines
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const historicalMetrics = await storage.getMonitoringMetrics({
      metricType: 'error_event_count',
      afterDate: sevenDaysAgo,
      beforeDate: oneDayAgo
    });

    // Calculate historical averages by component
    const componentHistoricalData = new Map<string, number[]>();
    for (const metric of historicalMetrics) {
      // Only use 24h period metrics for baseline calculation
      if (metric.metadata && (metric.metadata as any).period === '24h') {
        const component = metric.component || 'unknown';
        const value = parseInt(metric.metricValue, 10);
        
        if (!componentHistoricalData.has(component)) {
          componentHistoricalData.set(component, []);
        }
        componentHistoricalData.get(component)!.push(value);
      }
    }

    const componentAverages = new Map<string, number>();
    for (const [component, values] of componentHistoricalData.entries()) {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      componentAverages.set(component, avg);
    }

    console.log(`[ERROR GROWTH] Loaded historical baselines for ${componentAverages.size} components`);

    for (const row of componentCountsDaily) {
      const component = row.component || 'unknown';
      const count = row.count;
      components[component] = count;

      // Store 24h component-level metrics for future baseline calculations
      await storage.createMonitoringMetric({
        metricType: 'error_event_count',
        metricValue: count.toString(),
        component,
        metadata: {
          period: '24h',
          count
        }
      });

      // Compare against historical baseline
      const historicalAvg = componentAverages.get(component) || 0;
      
      if (historicalAvg === 0) {
        // New component with no historical data
        if (count > GROWTH_THRESHOLDS.MINIMUM_ABSOLUTE_EVENTS) {
          await storage.createMonitoringAlert({
            alertType: 'error_spike',
            severity: 'medium',
            message: `New error component '${component}' appeared with ${count} events in 24h (threshold: ${GROWTH_THRESHOLDS.MINIMUM_ABSOLUTE_EVENTS})`,
            affectedEntities: {
              component,
              currentCount: count,
              historicalAvg: 0
            }
          });

          alerts++;
          console.warn(`[ERROR GROWTH] ⚠️  NEW COMPONENT: ${component} with ${count} events`);
        }
      } else {
        // Existing component - compare against historical baseline
        // Only alert if current count > 150% of historical average AND > 50 absolute events
        const percentIncrease = ((count / historicalAvg) - 1) * 100;
        
        if (count > historicalAvg * GROWTH_THRESHOLDS.HISTORICAL_INCREASE_PERCENT && 
            count > GROWTH_THRESHOLDS.MINIMUM_ABSOLUTE_EVENTS) {
          await storage.createMonitoringAlert({
            alertType: 'error_spike',
            severity: 'high',
            message: `Component "${component}" showing ${percentIncrease.toFixed(0)}% increase in errors (current: ${count}, baseline: ${historicalAvg.toFixed(0)})`,
            affectedEntities: {
              component,
              currentCount: count,
              historicalAvg: historicalAvg,
              percentIncrease: percentIncrease
            }
          });

          alerts++;
          console.warn(`[ERROR GROWTH] 🚨 COMPONENT SPIKE: ${component} ${percentIncrease.toFixed(0)}% increase (${count} vs ${historicalAvg.toFixed(0)} baseline)`);
        }
      }
    }

    // 3. Flag growth anomalies
    if (growthRate > GROWTH_THRESHOLDS.HOURLY_VS_AVERAGE) {
      await storage.createMonitoringAlert({
        alertType: 'error_spike',
        severity: 'high',
        message: `Error spike detected: ${eventsLastHour} events in last hour (${growthRate.toFixed(1)}x hourly average of ${hourlyAverage.toFixed(0)})`,
        affectedEntities: {
          eventsLastHour,
          hourlyAverage,
          growthRate
        }
      });

      alerts++;
      console.warn(`[ERROR GROWTH] 🚨 SPIKE: ${eventsLastHour} events in last hour (${growthRate.toFixed(1)}x average)`);
    }

    // 4. Track database footprint
    const totalErrorEvents = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(errorEvents);

    const dbSize = totalErrorEvents[0]?.count || 0;

    await storage.createMonitoringMetric({
      metricType: 'db_size',
      metricValue: dbSize.toString(),
      component: 'error_events',
      metadata: {
        tableName: 'error_events',
        rowCount: dbSize
      }
    });

    // Alert if table too large
    if (dbSize > GROWTH_THRESHOLDS.DB_SIZE) {
      await storage.createMonitoringAlert({
        alertType: 'disk_space',
        severity: 'medium',
        message: `Error events table has ${dbSize} rows (threshold: ${GROWTH_THRESHOLDS.DB_SIZE}). Consider running error cleanup job.`,
        affectedEntities: {
          tableName: 'error_events',
          rowCount: dbSize
        }
      });

      alerts++;
      console.warn(`[ERROR GROWTH] ⚠️  LARGE TABLE: ${dbSize} rows in error_events (threshold: ${GROWTH_THRESHOLDS.DB_SIZE})`);
    }

    // Update monitoring run as completed
    await storage.updateMonitoringRun(monitoringRun.id, {
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        totalEvents,
        growthRate,
        components,
        alerts,
        dbSize,
        duration: Date.now() - startTime
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[ERROR GROWTH] Job completed in ${duration}ms: ${totalEvents} events, ${growthRate.toFixed(2)}x growth, ${alerts} alerts`);

    return {
      totalEvents,
      growthRate,
      components,
      alerts
    };
  } catch (error) {
    console.error('[ERROR GROWTH] Fatal error in error growth monitor job:', error);
    
    // Update monitoring run as failed
    await storage.updateMonitoringRun(monitoringRun.id, {
      status: 'failed',
      completedAt: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalEvents,
        growthRate,
        alerts
      }
    });
    
    throw error;
  }
}
