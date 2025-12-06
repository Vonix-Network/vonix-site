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

    // Initialize Discord bot
    console.log('🤖 Initializing Discord bot...');
    const { initDiscordBot } = await import('./lib/discord-bot');
    initDiscordBot().catch(err => {
      console.error('Failed to initialize Discord bot:', err);
    });

    console.log('✅ Server initialization complete');
  }
}
