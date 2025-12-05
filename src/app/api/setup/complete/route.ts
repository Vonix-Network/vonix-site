import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, setupStatus, siteSettings } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check if setup already completed
    const [status] = await db.select().from(setupStatus).limit(1);
    
    if (status?.isCompleted) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { admin, site, stripe } = body;

    // Validate admin data
    if (!admin?.username || !admin?.email || !admin?.password) {
      return NextResponse.json(
        { error: 'Admin credentials are required' },
        { status: 400 }
      );
    }

    // Check if admin user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, admin.username))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'Admin user already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    // Create admin user
    const [newAdmin] = await db
      .insert(users)
      .values({
        username: admin.username,
        email: admin.email,
        password: hashedPassword,
        role: 'superadmin',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Store site settings
    const settingsToStore = [
      {
        key: 'site_name',
        value: site?.siteName || 'Vonix Network',
        category: 'general',
        description: 'Site name displayed in header and title',
        isPublic: true,
      },
      {
        key: 'site_description',
        value: site?.siteDescription || 'The Ultimate Minecraft Community',
        category: 'general',
        description: 'Site description for SEO',
        isPublic: true,
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        category: 'general',
        description: 'Enable maintenance mode',
        isPublic: false,
      },
      {
        key: 'registration_enabled',
        value: 'true',
        category: 'security',
        description: 'Allow new user registrations',
        isPublic: false,
      },
    ];

    // Add Stripe settings if provided
    if (stripe?.enabled) {
      settingsToStore.push(
        {
          key: 'stripe_secret_key',
          value: stripe.secretKey || '',
          category: 'payments',
          description: 'Stripe secret key',
          isPublic: false,
        },
        {
          key: 'stripe_publishable_key',
          value: stripe.publishableKey || '',
          category: 'payments',
          description: 'Stripe publishable key',
          isPublic: true,
        },
        {
          key: 'stripe_webhook_secret',
          value: stripe.webhookSecret || '',
          category: 'payments',
          description: 'Stripe webhook secret',
          isPublic: false,
        },
        {
          key: 'payment_provider',
          value: 'stripe',
          category: 'payments',
          description: 'Active payment provider',
          isPublic: false,
        }
      );
    }

    // Insert settings
    for (const setting of settingsToStore) {
      await db
        .insert(siteSettings)
        .values({
          ...setting,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    // Mark setup as completed
    await db
      .insert(setupStatus)
      .values({
        isCompleted: true,
        completedAt: new Date(),
        adminUsername: admin.username,
        version: '4.0.0',
      })
      .onConflictDoNothing();

    console.log(`✅ Setup completed! Admin user created: ${admin.username}`);

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
      adminId: newAdmin.id,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed. Please try again.' },
      { status: 500 }
    );
  }
}
