/**
 * In-App Cron Job Manager
 * Runs scheduled tasks without needing system cron
 */

type CronJob = {
  name: string;
  schedule: number; // Interval in milliseconds
  handler: () => Promise<void>;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
};

class CronManager {
  private jobs: Map<string, NodeJS.Timeout> = new Map();
  private jobConfigs: Map<string, CronJob> = new Map();

  /**
   * Register a cron job
   * @param name - Unique job name
   * @param intervalMs - Run interval in milliseconds
   * @param handler - Function to execute
   */
  register(name: string, intervalMs: number, handler: () => Promise<void>) {
    const job: CronJob = {
      name,
      schedule: intervalMs,
      handler,
      running: false,
      nextRun: new Date(Date.now() + intervalMs),
    };

    this.jobConfigs.set(name, job);
    console.log(`📅 Registered cron job: ${name} (every ${intervalMs / 1000 / 60} minutes)`);
  }

  /**
   * Start a registered cron job
   */
  start(name: string) {
    const config = this.jobConfigs.get(name);
    if (!config) {
      console.error(`Cron job "${name}" not found`);
      return;
    }

    if (this.jobs.has(name)) {
      console.warn(`Cron job "${name}" is already running`);
      return;
    }

    // Run immediately on start
    this.executeJob(config);

    // Then schedule recurring execution
    const interval = setInterval(async () => {
      await this.executeJob(config);
    }, config.schedule);

    this.jobs.set(name, interval);
    console.log(`▶️  Started cron job: ${name}`);
  }

  /**
   * Stop a running cron job
   */
  stop(name: string) {
    const interval = this.jobs.get(name);
    if (interval) {
      clearInterval(interval);
      this.jobs.delete(name);
      console.log(`⏸️  Stopped cron job: ${name}`);
    }
  }

  /**
   * Execute a job
   */
  private async executeJob(job: CronJob) {
    if (job.running) {
      console.warn(`⏭️  Skipping ${job.name} - previous run still in progress`);
      return;
    }

    job.running = true;
    job.lastRun = new Date();

    try {
      console.log(`⚡ Running cron job: ${job.name}`);
      await job.handler();
      console.log(`✅ Completed cron job: ${job.name}`);
    } catch (error) {
      console.error(`❌ Error in cron job ${job.name}:`, error);
    } finally {
      job.running = false;
      job.nextRun = new Date(Date.now() + job.schedule);
    }
  }

  /**
   * Start all registered jobs
   */
  startAll() {
    console.log('🚀 Starting all cron jobs...');
    for (const name of this.jobConfigs.keys()) {
      this.start(name);
    }
  }

  /**
   * Stop all running jobs
   */
  stopAll() {
    console.log('🛑 Stopping all cron jobs...');
    for (const name of this.jobs.keys()) {
      this.stop(name);
    }
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    const status: any[] = [];
    
    for (const [name, config] of this.jobConfigs.entries()) {
      status.push({
        name,
        running: config.running,
        schedule: config.schedule,
        scheduleMinutes: config.schedule / 1000 / 60,
        lastRun: config.lastRun,
        nextRun: config.nextRun,
        isActive: this.jobs.has(name),
      });
    }

    return status;
  }
}

// Singleton instance
export const cronManager = new CronManager();

/**
 * Initialize all cron jobs
 * Call this once when the app starts
 */
export function initializeCronJobs() {
  console.log('🔧 Initializing cron jobs...');

  // Sync Minecraft usernames every hour
  cronManager.register(
    'sync-usernames',
    60 * 60 * 1000, // 1 hour
    async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/sync-usernames`, {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log('Username sync result:', data);
      } catch (error) {
        console.error('Failed to run username sync:', error);
      }
    }
  );

  // Expire ranks every hour
  cronManager.register(
    'expire-ranks',
    60 * 60 * 1000, // 1 hour
    async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/expire-ranks`, {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log('Rank expiration result:', data);
      } catch (error) {
        console.error('Failed to run rank expiration:', error);
      }
    }
  );

  // NOTE: Server status is now fetched LIVE from mcsrvstat.us on every request.
  // No cron job needed - status is never stored in the database.

  // Start all jobs
  cronManager.startAll();

  console.log('✅ Cron jobs initialized');
}

/**
 * Get cron job status
 */
export function getCronStatus() {
  return cronManager.getStatus();
}

