import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const settings = await db.select().from(siteSettings);

    // Convert to simple key-value object for frontend consumption
    const settingsObject: Record<string, any> = {};

    settings.forEach((setting) => {
      // Try to parse JSON values, fallback to string
      try {
        if (setting.value?.startsWith('{') || setting.value?.startsWith('[')) {
          settingsObject[setting.key] = JSON.parse(setting.value);
        } else if (setting.value === 'true') {
          settingsObject[setting.key] = true;
        } else if (setting.value === 'false') {
          settingsObject[setting.key] = false;
        } else if (!isNaN(Number(setting.value)) && setting.value !== '') {
          settingsObject[setting.key] = Number(setting.value);
        } else {
          settingsObject[setting.key] = setting.value;
        }
      } catch {
        settingsObject[setting.key] = setting.value;
      }
    });

    // Map database keys to frontend-friendly format
    const result: Record<string, any> = {
      siteName: settingsObject['site_name'] || 'Vonix Network',
      siteDescription: settingsObject['site_description'] || 'The Ultimate Minecraft Community',
      maintenanceMode: settingsObject['maintenance_mode'] || false,
      maintenanceMessage: settingsObject['maintenance_message'] || 'Under Maintenance, Expect possible downtimes.',
      registrationEnabled: settingsObject['registration_enabled'] !== false,
      requireRegistrationCode: settingsObject['require_registration_code'] !== false,
      defaultUserRole: settingsObject['default_user_role'] || 'user',
      maxLoginAttempts: settingsObject['max_login_attempts'] || 5,
      lockoutDuration: settingsObject['lockout_duration'] || 15,
      // Payment provider
      paymentProvider: settingsObject['payment_provider'] || 'stripe',
      // Stripe settings
      stripeMode: settingsObject['stripe_mode'] || 'test',
      stripeTestPublishableKey: settingsObject['stripe_test_publishable_key'] || '',
      stripeTestSecretKey: settingsObject['stripe_test_secret_key'] ? '••••••••' : '',
      stripeLivePublishableKey: settingsObject['stripe_live_publishable_key'] || '',
      stripeLiveSecretKey: settingsObject['stripe_live_secret_key'] ? '••••••••' : '',
      stripeWebhookSecret: settingsObject['stripe_webhook_secret'] ? '••••••••' : '',
      // Ko-Fi settings
      kofiVerificationToken: settingsObject['kofi_verification_token'] ? '••••••••' : '',
      kofiPageUrl: settingsObject['kofi_page_url'] || '',
      // SMTP settings
      smtpHost: settingsObject['smtp_host'] || '',
      smtpPort: settingsObject['smtp_port'] || 587,
      smtpUser: settingsObject['smtp_user'] || '',
      smtpPassword: settingsObject['smtp_password'] ? '••••••••' : '',
      smtpFromEmail: settingsObject['smtp_from_email'] || '',
      smtpFromName: settingsObject['smtp_from_name'] || 'Vonix Network',
      smtpSecure: settingsObject['smtp_secure'] !== false,
      // Admin notification email settings
      smtpAdminNotifyEmail: settingsObject['smtp_admin_notify_email'] || '',
      smtpAdminNotifyErrors: settingsObject['smtp_admin_notify_errors'] === true,
      smtpAdminNotifyDonations: settingsObject['smtp_admin_notify_donations'] === true,
      smtpAdminNotifyRegistrations: settingsObject['smtp_admin_notify_registrations'] === true,
      // Notification settings
      notifications: settingsObject['notifications'] || {
        emailNotifications: true,
        forumReplies: true,
        friendRequests: true,
        privateMessages: true,
        serverUpdates: true,
        announcements: true,
        donationConfirmations: true,
        levelUpNotifications: true,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();

    // Map frontend keys to database keys
    const keyMapping: Record<string, { dbKey: string; category: string; isPublic: boolean; isJson?: boolean }> = {
      siteName: { dbKey: 'site_name', category: 'general', isPublic: true },
      siteDescription: { dbKey: 'site_description', category: 'general', isPublic: true },
      maintenanceMode: { dbKey: 'maintenance_mode', category: 'general', isPublic: false },
      maintenanceMessage: { dbKey: 'maintenance_message', category: 'general', isPublic: false },
      registrationEnabled: { dbKey: 'registration_enabled', category: 'security', isPublic: false },
      requireRegistrationCode: { dbKey: 'require_registration_code', category: 'security', isPublic: false },
      defaultUserRole: { dbKey: 'default_user_role', category: 'security', isPublic: false },
      maxLoginAttempts: { dbKey: 'max_login_attempts', category: 'security', isPublic: false },
      lockoutDuration: { dbKey: 'lockout_duration', category: 'security', isPublic: false },
      // Payment settings
      paymentProvider: { dbKey: 'payment_provider', category: 'payments', isPublic: false },
      stripeMode: { dbKey: 'stripe_mode', category: 'payments', isPublic: false },
      stripeTestPublishableKey: { dbKey: 'stripe_test_publishable_key', category: 'payments', isPublic: false },
      stripeTestSecretKey: { dbKey: 'stripe_test_secret_key', category: 'payments', isPublic: false },
      stripeLivePublishableKey: { dbKey: 'stripe_live_publishable_key', category: 'payments', isPublic: false },
      stripeLiveSecretKey: { dbKey: 'stripe_live_secret_key', category: 'payments', isPublic: false },
      stripeWebhookSecret: { dbKey: 'stripe_webhook_secret', category: 'payments', isPublic: false },
      // Ko-Fi settings
      kofiVerificationToken: { dbKey: 'kofi_verification_token', category: 'payments', isPublic: false },
      kofiPageUrl: { dbKey: 'kofi_page_url', category: 'payments', isPublic: false },
      // SMTP settings
      smtpHost: { dbKey: 'smtp_host', category: 'email', isPublic: false },
      smtpPort: { dbKey: 'smtp_port', category: 'email', isPublic: false },
      smtpUser: { dbKey: 'smtp_user', category: 'email', isPublic: false },
      smtpPassword: { dbKey: 'smtp_password', category: 'email', isPublic: false },
      smtpFromEmail: { dbKey: 'smtp_from_email', category: 'email', isPublic: false },
      smtpFromName: { dbKey: 'smtp_from_name', category: 'email', isPublic: false },
      smtpSecure: { dbKey: 'smtp_secure', category: 'email', isPublic: false },
      // Admin notification settings
      smtpAdminNotifyEmail: { dbKey: 'smtp_admin_notify_email', category: 'email', isPublic: false },
      smtpAdminNotifyErrors: { dbKey: 'smtp_admin_notify_errors', category: 'email', isPublic: false },
      smtpAdminNotifyDonations: { dbKey: 'smtp_admin_notify_donations', category: 'email', isPublic: false },
      smtpAdminNotifyRegistrations: { dbKey: 'smtp_admin_notify_registrations', category: 'email', isPublic: false },
      // Notification settings (stored as JSON)
      notifications: { dbKey: 'notifications', category: 'notifications', isPublic: false, isJson: true },
    };

    // Upsert each setting
    for (const [frontendKey, value] of Object.entries(body)) {
      const mapping = keyMapping[frontendKey];
      if (!mapping) continue;

      // Skip masked values (don't overwrite existing secrets with placeholder)
      if (typeof value === 'string' && value.includes('••••')) continue;

      const stringValue = mapping.isJson
        ? JSON.stringify(value)
        : (typeof value === 'boolean' ? String(value) : String(value));

      // Try to update first
      const result = await db
        .update(siteSettings)
        .set({
          value: stringValue,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, mapping.dbKey))
        .returning();

      // If no rows updated, insert
      if (result.length === 0) {
        await db.insert(siteSettings).values({
          key: mapping.dbKey,
          value: stringValue,
          category: mapping.category,
          isPublic: mapping.isPublic,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Clear caches so new settings take effect immediately
    const { clearSettingsCache } = await import('@/lib/settings');
    const { clearStripeConfigCache } = await import('@/lib/stripe');
    const { clearKofiConfigCache } = await import('@/lib/kofi');
    clearSettingsCache();
    clearStripeConfigCache();
    clearKofiConfigCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { key, value, category, description, isPublic } = body;

    if (!key || !category) {
      return NextResponse.json(
        { error: 'Key and category are required' },
        { status: 400 }
      );
    }

    await db.insert(siteSettings).values({
      key,
      value,
      category,
      description: description || null,
      isPublic: isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error creating setting:', error);
    return NextResponse.json(
      { error: 'Failed to create setting' },
      { status: 500 }
    );
  }
}

