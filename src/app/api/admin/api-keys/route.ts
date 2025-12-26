import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { desc } from 'drizzle-orm';
import crypto from 'crypto';
import { requirePermission } from '@/lib/auth-guard';

// Generate a secure API key
function generateSecureApiKey(): string {
  return 'vnx_' + crypto.randomBytes(32).toString('hex');
}

export async function GET() {
  try {
    const { error } = await requirePermission('apikeys:read');
    if (error) return error;

    const keys = await db
      .select()
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));

    return NextResponse.json(keys);
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requirePermission('apikeys:write');
    if (error) return error;

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const key = generateSecureApiKey();

    const [newKey] = await db.insert(apiKeys).values({
      name: name.trim(),
      key,
    }).returning();

    return NextResponse.json(newKey, { status: 201 });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

