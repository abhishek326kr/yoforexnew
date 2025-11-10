import { db } from '../db.js';
import { errorGroups, errorEvents, errorStatusChanges } from '../../shared/schema.js';
import { eq, and, gte, sql, desc, or, ilike } from 'drizzle-orm';

interface ResolutionRule {
  id: string;
  name: string;
  pattern: RegExp | string;
  resolution: 'ignore' | 'resolve' | 'escalate';
  autoResolveAfter?: number; // minutes
  notifyAdmins?: boolean;
  tags?: string[];
  metadata?: any;
}

// Predefined resolution rules for common errors
const RESOLUTION_RULES: ResolutionRule[] = [
  // Network errors that are transient
  {
    id: 'network-timeout',
    name: 'Network Timeout',
    pattern: /ETIMEDOUT|ESOCKETTIMEDOUT|timeout of \d+ms exceeded/i,
    resolution: 'resolve',
    autoResolveAfter: 5,
    tags: ['network', 'transient']
  },
  {
    id: 'network-connection',
    name: 'Connection Error',
    pattern: /ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH/i,
    resolution: 'resolve',
    autoResolveAfter: 10,
    tags: ['network', 'connectivity']
  },
  
  // Database errors
  {
    id: 'db-connection',
    name: 'Database Connection',
    pattern: /connection to database|pool is closed|too many connections/i,
    resolution: 'escalate',
    notifyAdmins: true,
    tags: ['database', 'critical']
  },
  {
    id: 'db-deadlock',
    name: 'Database Deadlock',
    pattern: /deadlock detected|lock wait timeout/i,
    resolution: 'resolve',
    autoResolveAfter: 2,
    tags: ['database', 'transient']
  },
  
  // Rate limiting
  {
    id: 'rate-limit',
    name: 'Rate Limit',
    pattern: /rate limit|too many requests|429/i,
    resolution: 'ignore',
    tags: ['rate-limit', 'expected']
  },
  
  // Authentication errors
  {
    id: 'auth-expired',
    name: 'Expired Token',
    pattern: /token expired|jwt expired|session expired/i,
    resolution: 'ignore',
    tags: ['auth', 'expected']
  },
  {
    id: 'auth-invalid',
    name: 'Invalid Credentials',
    pattern: /invalid credentials|unauthorized|401/i,
    resolution: 'ignore',
    tags: ['auth', 'user-error']
  },
  
  // Client errors
  {
    id: 'client-abort',
    name: 'Client Aborted',
    pattern: /client.*abort|request aborted|ECONNABORTED/i,
    resolution: 'ignore',
    tags: ['client', 'expected']
  },
  {
    id: 'bad-request',
    name: 'Bad Request',
    pattern: /bad request|invalid input|validation failed|400/i,
    resolution: 'ignore',
    tags: ['client', 'user-error']
  },
  
  // Memory issues
  {
    id: 'memory-leak',
    name: 'Memory Issue',
    pattern: /heap out of memory|maximum call stack|allocation failed/i,
    resolution: 'escalate',
    notifyAdmins: true,
    tags: ['memory', 'critical', 'performance']
  },
  
  // Third-party API errors
  {
    id: 'stripe-error',
    name: 'Stripe API Error',
    pattern: /stripe.*error|payment.*failed/i,
    resolution: 'resolve',
    autoResolveAfter: 30,
    tags: ['payment', 'third-party']
  },
  {
    id: 'email-bounce',
    name: 'Email Bounce',
    pattern: /email.*bounce|invalid email|smtp error/i,
    resolution: 'ignore',
    tags: ['email', 'expected']
  }
];

// Match error against resolution rules
export function matchResolutionRule(errorMessage: string, errorStack?: string | null): ResolutionRule | null {
  const fullError = `${errorMessage} ${errorStack || ''}`;
  
  for (const rule of RESOLUTION_RULES) {
    if (rule.pattern instanceof RegExp) {
      if (rule.pattern.test(fullError)) {
        return rule;
      }
    } else if (fullError.toLowerCase().includes(rule.pattern.toLowerCase())) {
      return rule;
    }
  }
  
  return null;
}

// Auto-resolve errors based on rules
export async function autoResolveErrors() {
  try {
    // Get unresolved error groups from the last 24 hours
    const unresolvedErrors = await db.select()
      .from(errorGroups)
      .where(
        and(
          eq(errorGroups.status, 'unresolved'),
          gte(errorGroups.lastOccurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(errorGroups.occurrenceCount));
    
    let resolvedCount = 0;
    let ignoredCount = 0;
    let escalatedCount = 0;
    
    for (const errorGroup of unresolvedErrors) {
      const rule = matchResolutionRule(errorGroup.message, errorGroup.stackTrace);
      
      if (!rule) continue;
      
      // Check if enough time has passed for auto-resolution
      if (rule.autoResolveAfter) {
        const minutesSinceLastOccurrence = (Date.now() - new Date(errorGroup.lastOccurredAt).getTime()) / (1000 * 60);
        if (minutesSinceLastOccurrence < rule.autoResolveAfter) {
          continue; // Not enough time has passed
        }
      }
      
      let newStatus: 'resolved' | 'ignored' | 'monitoring' = 'resolved';
      let resolutionNotes = `Auto-resolved by rule: ${rule.name}`;
      
      switch (rule.resolution) {
        case 'ignore':
          newStatus = 'ignored';
          resolutionNotes = `Auto-ignored by rule: ${rule.name} (${rule.tags?.join(', ')})`;
          ignoredCount++;
          break;
        case 'resolve':
          newStatus = 'resolved';
          resolutionNotes = `Auto-resolved by rule: ${rule.name} (${rule.tags?.join(', ')})`;
          resolvedCount++;
          break;
        case 'escalate':
          newStatus = 'monitoring';
          resolutionNotes = `Escalated for monitoring by rule: ${rule.name}`;
          escalatedCount++;
          if (rule.notifyAdmins) {
            // TODO: Send notification to admins
            console.log(`[ERROR AUTO-RESOLUTION] Escalating error ${errorGroup.id} to admins`);
          }
          break;
      }
      
      // Update error group status
      await db.update(errorGroups)
        .set({
          status: newStatus,
          resolutionNotes,
          resolvedAt: newStatus === 'resolved' ? new Date() : null,
          resolvedBy: 'auto-resolution'
        })
        .where(eq(errorGroups.id, errorGroup.id));
      
      // Add status change record
      await db.insert(errorStatusChanges).values({
        errorGroupId: errorGroup.id,
        previousStatus: errorGroup.status,
        newStatus,
        changedBy: 'auto-resolution',
        reason: resolutionNotes,
        metadata: {
          rule: rule.id,
          ruleName: rule.name,
          tags: rule.tags
        }
      });
    }
    
    return {
      success: true,
      resolved: resolvedCount,
      ignored: ignoredCount,
      escalated: escalatedCount,
      total: unresolvedErrors.length
    };
  } catch (error) {
    console.error('[ERROR AUTO-RESOLUTION] Failed to auto-resolve errors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get resolution history for an error group
export async function getResolutionHistory(errorGroupId: string) {
  try {
    const history = await db.select()
      .from(errorStatusChanges)
      .where(eq(errorStatusChanges.errorGroupId, errorGroupId))
      .orderBy(desc(errorStatusChanges.changedAt));
    
    return history;
  } catch (error) {
    console.error('[ERROR AUTO-RESOLUTION] Failed to get resolution history:', error);
    return [];
  }
}

// Add custom resolution rule
export function addCustomRule(rule: ResolutionRule) {
  RESOLUTION_RULES.push(rule);
}

// Get all resolution rules
export function getResolutionRules() {
  return RESOLUTION_RULES;
}

// Test a rule against recent errors
export async function testResolutionRule(pattern: string | RegExp) {
  try {
    const recentErrors = await db.select()
      .from(errorGroups)
      .where(
        gte(errorGroups.lastOccurredAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      )
      .limit(100);
    
    const matches = recentErrors.filter(error => {
      const fullError = `${error.message} ${error.stackTrace || ''}`;
      if (pattern instanceof RegExp) {
        return pattern.test(fullError);
      }
      return fullError.toLowerCase().includes(pattern.toLowerCase());
    });
    
    return {
      totalErrors: recentErrors.length,
      matchedErrors: matches.length,
      matches: matches.map(m => ({
        id: m.id,
        message: m.message,
        occurrenceCount: m.occurrenceCount,
        status: m.status
      }))
    };
  } catch (error) {
    console.error('[ERROR AUTO-RESOLUTION] Failed to test rule:', error);
    return null;
  }
}

// Schedule auto-resolution to run periodically
export function scheduleAutoResolution(intervalMinutes: number = 5) {
  setInterval(async () => {
    const result = await autoResolveErrors();
    if (result.success && (result.resolved > 0 || result.ignored > 0 || result.escalated > 0)) {
      console.log(`[ERROR AUTO-RESOLUTION] Processed: ${result.resolved} resolved, ${result.ignored} ignored, ${result.escalated} escalated`);
    }
  }, intervalMinutes * 60 * 1000);
  
  // Run immediately on startup
  autoResolveErrors();
}