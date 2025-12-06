import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { registrationCodes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/auth/verify-code
 * Validates a registration code and returns Minecraft account details
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 8) {
      return NextResponse.json(
        { valid: false, error: 'Invalid code format' },
        { status: 400 }
      );
    }

    // Find the registration code
    const registrationCode = await db.query.registrationCodes.findFirst({
      where: and(
        eq(registrationCodes.code, code.toUpperCase()),
        eq(registrationCodes.used, false)
      ),
    });

    if (!registrationCode) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or already used registration code',
      });
    }

    // Check if code is expired
    if (new Date(registrationCode.expiresAt) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Registration code has expired',
      });
    }

    // Return the Minecraft account details
    return NextResponse.json({
      valid: true,
      minecraftUsername: registrationCode.minecraftUsername,
      minecraftUuid: registrationCode.minecraftUuid,
    });
  } catch (error) {
    console.error('Error verifying registration code:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}


