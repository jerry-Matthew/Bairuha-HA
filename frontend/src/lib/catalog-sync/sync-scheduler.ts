/**
 * Catalog Sync Scheduler
 * 
 * Handles periodic scheduling of catalog syncs using node-cron.
 */

import cron from 'node-cron';
import { syncCatalog } from './sync-orchestrator';

export interface SyncScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  time?: string; // Time of day (e.g., "02:00" for 2 AM)
  dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
  incrementalOnly?: boolean; // Only run incremental syncs
}

let scheduledTask: cron.ScheduledTask | null = null;
let currentConfig: SyncScheduleConfig | null = null;

/**
 * Initialize sync scheduler
 */
export async function initializeScheduler(config: SyncScheduleConfig): Promise<void> {
  // Cancel existing schedule if any
  cancelScheduledSyncs();

  currentConfig = config;

  if (!config.enabled) {
    return;
  }

  // Build cron expression
  const cronExpression = buildCronExpression(config);
  
  if (!cronExpression) {
    throw new Error(`Invalid schedule configuration: ${JSON.stringify(config)}`);
  }

  // Schedule sync
  scheduledTask = cron.schedule(cronExpression, async () => {
    try {
      console.log(`[Catalog Sync] Running scheduled sync (${config.frequency})`);
      await syncCatalog({
        type: config.incrementalOnly ? 'incremental' : 'full',
      });
    } catch (error: any) {
      console.error(`[Catalog Sync] Scheduled sync failed:`, error.message);
    }
  }, {
    scheduled: true,
    timezone: 'UTC', // Use UTC for consistency
  });

  console.log(`[Catalog Sync] Scheduler initialized: ${config.frequency} at ${config.time || 'default time'}`);
}

/**
 * Build cron expression from config
 */
function buildCronExpression(config: SyncScheduleConfig): string | null {
  if (!config.time) {
    // Default to 2 AM UTC
    config.time = '02:00';
  }

  const [hours, minutes] = config.time.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  switch (config.frequency) {
    case 'daily':
      // Run daily at specified time
      return `${minutes} ${hours} * * *`;

    case 'weekly':
      // Run weekly on specified day at specified time
      const dayOfWeek = config.dayOfWeek !== undefined ? config.dayOfWeek : 0; // Default to Sunday
      return `${minutes} ${hours} * * ${dayOfWeek}`;

    case 'custom':
      // For custom, user should provide cron expression directly
      // This is a placeholder - would need additional config field
      return null;

    default:
      return null;
  }
}

/**
 * Schedule next sync
 */
export function scheduleNextSync(config: SyncScheduleConfig): void {
  initializeScheduler(config).catch(error => {
    console.error(`[Catalog Sync] Failed to schedule sync:`, error);
  });
}

/**
 * Cancel scheduled syncs
 */
export function cancelScheduledSyncs(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  currentConfig = null;
}

/**
 * Get current schedule config
 */
export function getCurrentScheduleConfig(): SyncScheduleConfig | null {
  return currentConfig;
}

/**
 * Run scheduled sync manually (for testing)
 */
export async function runScheduledSync(): Promise<void> {
  if (!currentConfig) {
    throw new Error('No schedule configured');
  }

  await syncCatalog({
    type: currentConfig.incrementalOnly ? 'incremental' : 'full',
  });
}
