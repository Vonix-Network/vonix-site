import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET() {
  const startTime = Date.now();
  
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown', latency: 0 },
      stripe: { status: 'unknown' },
      environment: { status: 'unknown' },
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await db.select({ count: sql<number>`1` }).from(users).limit(1);
    checks.checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error: any) {
    checks.checks.database = {
      status: 'unhealthy',
      latency: 0,
    };
    checks.status = 'degraded';
  }

  // Check Stripe configuration
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    checks.checks.stripe = { status: 'configured' };
  } else {
    checks.checks.stripe = { status: 'not_configured' };
  }

  // Check environment
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length === 0) {
    checks.checks.environment = { status: 'healthy' };
  } else {
    checks.checks.environment = { 
      status: 'warning',
      missing: missingEnvVars,
    } as any;
  }

  const responseTime = Date.now() - startTime;

  return NextResponse.json({
    ...checks,
    responseTime,
  }, {
    status: checks.status === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

