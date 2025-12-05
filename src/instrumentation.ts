/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Server starting...');
    
    // Initialize in-app cron jobs
    const { initializeCronJobs } = await import('./lib/cron');
    initializeCronJobs();
    
    console.log('✅ Server initialization complete');
  }
}
