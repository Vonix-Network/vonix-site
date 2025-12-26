/**
 * Email Service Library
 * Centralized email sending with templates for all notification types
 */

import { db } from '@/db';
import { siteSettings, users } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// =============================================================================
// TYPES
// =============================================================================

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  // Admin notification settings
  adminNotifyEmail: string;
  adminNotifyErrors: boolean;
  adminNotifyDonations: boolean;
  adminNotifyRegistrations: boolean;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// =============================================================================
// SMTP CONFIGURATION
// =============================================================================

/**
 * Get SMTP configuration from database
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const settings = await db
      .select()
      .from(siteSettings)
      .where(like(siteSettings.key, 'smtp_%'));

    const getValue = (key: string) =>
      settings.find((s: any) => s.key === key)?.value || '';

    const host = getValue('smtp_host');
    const user = getValue('smtp_user');
    const password = getValue('smtp_password');

    if (!host || !user || !password) {
      return null;
    }

    return {
      host,
      port: parseInt(getValue('smtp_port')) || 587,
      user,
      password,
      fromEmail: getValue('smtp_from_email') || user,
      fromName: getValue('smtp_from_name') || 'Vonix Network',
      secure: getValue('smtp_secure') === 'true',
      // Admin notification settings
      adminNotifyEmail: getValue('smtp_admin_notify_email') || getValue('smtp_from_email') || user,
      adminNotifyErrors: getValue('smtp_admin_notify_errors') === 'true',
      adminNotifyDonations: getValue('smtp_admin_notify_donations') === 'true',
      adminNotifyRegistrations: getValue('smtp_admin_notify_registrations') === 'true',
    };
  } catch (error: any) {
    console.error('Error getting SMTP config:', error);
    return null;
  }
}

/**
 * Check if email is configured
 */
export async function isEmailConfigured(): Promise<boolean> {
  const config = await getSmtpConfig();
  return config !== null;
}

/**
 * Create nodemailer transporter
 */
function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send an email using SMTP settings from database
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config) {
      console.warn('Email not configured, skipping send');
      return false;
    }

    const transporter = createTransporter(config);

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    return false;
  }
}

// =============================================================================
// EMAIL TEMPLATES - BASE LAYOUT
// =============================================================================

function getBaseEmailTemplate(content: string, title: string = ''): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: rgba(26, 26, 46, 0.9); border-radius: 16px; border: 1px solid rgba(0, 255, 255, 0.2); overflow: hidden;">
    <tr>
      <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-bottom: 1px solid rgba(0, 255, 255, 0.2);">
        <h1 style="color: #00ffff; font-size: 24px; margin: 0; font-weight: 700;">
          Vonix Network
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="color: #666; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Vonix Network. All rights reserved.<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network'}" style="color: #00ffff; text-decoration: none;">Visit Website</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// =============================================================================
// NOTIFICATION EMAIL TEMPLATES
// =============================================================================

/**
 * New private message notification
 */
export function getNewMessageEmailTemplate(
  senderName: string,
  messagePreview: string = ''
): EmailTemplate {
  const content = `
    <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
      📩 New Message from ${senderName}
    </h2>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      You have received a new private message on Vonix Network.
    </p>
    ${messagePreview ? `
    <div style="background: rgba(0, 255, 255, 0.1); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #a0a0a0; font-size: 14px; margin: 0; font-style: italic;">
        "${messagePreview.substring(0, 200)}${messagePreview.length > 200 ? '...' : ''}"
      </p>
    </div>
    ` : ''}
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/messages" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%); color: #000; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View Message
      </a>
    </div>
  `;

  return {
    subject: `💬 New message from ${senderName}`,
    html: getBaseEmailTemplate(content, 'New Message'),
    text: `New message from ${senderName} on Vonix Network. Visit ${process.env.NEXT_PUBLIC_APP_URL}/messages to read it.`,
  };
}

/**
 * Forum reply notification
 */
export function getForumReplyEmailTemplate(
  replierName: string,
  postTitle: string,
  postId: number,
  replyPreview: string = ''
): EmailTemplate {
  const content = `
    <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
      💬 New Reply to Your Post
    </h2>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      <strong style="color: #00ffff;">${replierName}</strong> replied to your forum post:
    </p>
    <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; padding: 12px 16px; margin: 16px 0;">
      <p style="color: #ffffff; font-size: 16px; margin: 0; font-weight: 600;">
        "${postTitle}"
      </p>
    </div>
    ${replyPreview ? `
    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #a0a0a0; font-size: 14px; margin: 0;">
        ${replyPreview.substring(0, 300)}${replyPreview.length > 300 ? '...' : ''}
      </p>
    </div>
    ` : ''}
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/forum/post/${postId}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%); color: #000; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View Reply
      </a>
    </div>
  `;

  return {
    subject: `💬 ${replierName} replied to "${postTitle}"`,
    html: getBaseEmailTemplate(content, 'Forum Reply'),
    text: `${replierName} replied to your post "${postTitle}" on Vonix Network. Visit ${process.env.NEXT_PUBLIC_APP_URL}/forum/post/${postId} to see it.`,
  };
}

/**
 * Friend request notification
 */
export function getFriendRequestEmailTemplate(requesterName: string): EmailTemplate {
  const content = `
    <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
      👋 New Friend Request
    </h2>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      <strong style="color: #00ffff;">${requesterName}</strong> wants to be your friend on Vonix Network!
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/friends" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%); color: #000; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View Request
      </a>
    </div>
  `;

  return {
    subject: `👋 ${requesterName} sent you a friend request`,
    html: getBaseEmailTemplate(content, 'Friend Request'),
    text: `${requesterName} sent you a friend request on Vonix Network.`,
  };
}

// =============================================================================
// ADMIN NOTIFICATION EMAILS
// =============================================================================

/**
 * Site error notification (for admins)
 */
export function getErrorAlertEmailTemplate(
  errorType: string,
  errorMessage: string,
  errorStack?: string,
  requestInfo?: {
    url?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
  }
): EmailTemplate {
  const content = `
    <h2 style="color: #ef4444; font-size: 20px; margin: 0 0 16px 0;">
      🚨 Site Error Alert
    </h2>
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="color: #ef4444; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
        ${errorType}
      </p>
      <p style="color: #ffffff; font-size: 14px; margin: 0;">
        ${errorMessage}
      </p>
    </div>
    ${requestInfo ? `
    <h3 style="color: #ffffff; font-size: 16px; margin: 24px 0 12px 0;">Request Details</h3>
    <table style="width: 100%; font-size: 13px;">
      ${requestInfo.url ? `<tr><td style="color: #666; padding: 4px 0;">URL:</td><td style="color: #a0a0a0; padding: 4px 0;">${requestInfo.url}</td></tr>` : ''}
      ${requestInfo.method ? `<tr><td style="color: #666; padding: 4px 0;">Method:</td><td style="color: #a0a0a0; padding: 4px 0;">${requestInfo.method}</td></tr>` : ''}
      ${requestInfo.ip ? `<tr><td style="color: #666; padding: 4px 0;">IP:</td><td style="color: #a0a0a0; padding: 4px 0;">${requestInfo.ip}</td></tr>` : ''}
      ${requestInfo.userAgent ? `<tr><td style="color: #666; padding: 4px 0;">User Agent:</td><td style="color: #a0a0a0; padding: 4px 0; word-break: break-all;">${requestInfo.userAgent}</td></tr>` : ''}
    </table>
    ` : ''}
    ${errorStack ? `
    <h3 style="color: #ffffff; font-size: 16px; margin: 24px 0 12px 0;">Stack Trace</h3>
    <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #a0a0a0; font-size: 12px; margin: 0; white-space: pre-wrap; word-break: break-all;">${errorStack}</pre>
    </div>
    ` : ''}
    <p style="color: #666; font-size: 12px; margin-top: 24px; text-align: center;">
      Time: ${new Date().toISOString()}<br>
      Environment: ${process.env.NODE_ENV || 'unknown'}
    </p>
  `;

  return {
    subject: `🚨 [${process.env.NODE_ENV?.toUpperCase() || 'SITE'}] Error: ${errorType}`,
    html: getBaseEmailTemplate(content, 'Error Alert'),
    text: `Site Error: ${errorType}\n\n${errorMessage}\n\n${errorStack || ''}`,
  };
}

/**
 * New donation notification (for admins)
 */
export function getNewDonationAdminEmailTemplate(
  username: string,
  amount: number,
  rankName?: string
): EmailTemplate {
  const content = `
    <h2 style="color: #22c55e; font-size: 20px; margin: 0 0 16px 0;">
      💚 New Donation Received!
    </h2>
    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 20px; text-align: center;">
      <p style="color: #22c55e; font-size: 32px; font-weight: 700; margin: 0;">
        $${amount.toFixed(2)}
      </p>
      <p style="color: #a0a0a0; font-size: 14px; margin: 8px 0 0 0;">
        from <strong style="color: #00ffff;">${username}</strong>
        ${rankName ? ` for <strong style="color: #8b5cf6;">${rankName}</strong>` : ''}
      </p>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/donations" style="display: inline-block; padding: 12px 32px; background: rgba(255,255,255,0.1); color: #ffffff; text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
        View Donations
      </a>
    </div>
  `;

  return {
    subject: `💚 New Donation: $${amount.toFixed(2)} from ${username}`,
    html: getBaseEmailTemplate(content, 'New Donation'),
    text: `New donation received: $${amount.toFixed(2)} from ${username}${rankName ? ` for ${rankName}` : ''}`,
  };
}

/**
 * New user registration notification (for admins)
 */
export function getNewUserAdminEmailTemplate(
  username: string,
  email?: string
): EmailTemplate {
  const content = `
    <h2 style="color: #8b5cf6; font-size: 20px; margin: 0 0 16px 0;">
      👤 New User Registration
    </h2>
    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 20px;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #666; padding: 4px 0;">Username:</td>
          <td style="color: #00ffff; padding: 4px 0; font-weight: 600;">${username}</td>
        </tr>
        ${email ? `
        <tr>
          <td style="color: #666; padding: 4px 0;">Email:</td>
          <td style="color: #a0a0a0; padding: 4px 0;">${email}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #666; padding: 4px 0;">Registered:</td>
          <td style="color: #a0a0a0; padding: 4px 0;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/users" style="display: inline-block; padding: 12px 32px; background: rgba(255,255,255,0.1); color: #ffffff; text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
        View Users
      </a>
    </div>
  `;

  return {
    subject: `👤 New User: ${username} registered`,
    html: getBaseEmailTemplate(content, 'New Registration'),
    text: `New user registered: ${username}${email ? ` (${email})` : ''}`,
  };
}

// =============================================================================
// HIGH-LEVEL NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Send admin error alert
 */
export async function sendAdminErrorAlert(
  errorType: string,
  errorMessage: string,
  errorStack?: string,
  requestInfo?: {
    url?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
  }
): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config || !config.adminNotifyErrors || !config.adminNotifyEmail) {
      return false;
    }

    const template = getErrorAlertEmailTemplate(errorType, errorMessage, errorStack, requestInfo);
    return await sendEmail(config.adminNotifyEmail, template);
  } catch (error: any) {
    console.error('Error sending admin error alert:', error);
    return false;
  }
}

/**
 * Send admin donation notification
 */
export async function sendAdminDonationAlert(
  username: string,
  amount: number,
  rankName?: string
): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config || !config.adminNotifyDonations || !config.adminNotifyEmail) {
      return false;
    }

    const template = getNewDonationAdminEmailTemplate(username, amount, rankName);
    return await sendEmail(config.adminNotifyEmail, template);
  } catch (error: any) {
    console.error('Error sending admin donation alert:', error);
    return false;
  }
}

/**
 * Send admin new user notification
 */
export async function sendAdminNewUserAlert(
  username: string,
  email?: string
): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config || !config.adminNotifyRegistrations || !config.adminNotifyEmail) {
      return false;
    }

    const template = getNewUserAdminEmailTemplate(username, email);
    return await sendEmail(config.adminNotifyEmail, template);
  } catch (error: any) {
    console.error('Error sending admin new user alert:', error);
    return false;
  }
}

/**
 * Send user notification email (checks user preferences)
 */
export async function sendUserNotificationEmail(
  userId: number,
  notificationType: 'message' | 'forum_reply' | 'friend_request',
  template: EmailTemplate
): Promise<boolean> {
  try {
    // Get user email
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) {
      return false;
    }

    // TODO: Check user notification preferences from user_settings table
    // For now, send if email exists

    return await sendEmail(user.email, template);
  } catch (error: any) {
    console.error('Error sending user notification email:', error);
    return false;
  }
}

// =============================================================================
// USER DONATION RECEIPT EMAIL
// =============================================================================

/**
 * Donation receipt email template (for donors)
 */
export function getDonationReceiptEmailTemplate(options: {
  username: string;
  amount: number;
  rankName?: string;
  days?: number;
  paymentId?: string;
  orderId?: string;
}): EmailTemplate {
  const { username, amount, rankName, days, paymentId, orderId } = options;

  const content = `
    <h2 style="color: #22c55e; font-size: 20px; margin: 0 0 16px 0;">
      🎉 Thank You for Your Donation!
    </h2>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      Hey <strong style="color: #00ffff;">${username}</strong>, thank you for supporting Vonix Network!
    </p>
    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <p style="color: #22c55e; font-size: 32px; font-weight: 700; margin: 0;">
        $${amount.toFixed(2)}
      </p>
      ${rankName && rankName !== 'one-time' ? `
      <p style="color: #8b5cf6; font-size: 16px; margin: 8px 0 0 0;">
        👑 ${rankName} Rank${days ? ` - ${days} days` : ''}
      </p>
      ` : ''}
    </div>
    <table style="width: 100%; font-size: 14px; margin: 24px 0; border-collapse: collapse;">
      <tr>
        <td style="color: #666; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">Transaction ID:</td>
        <td style="color: #a0a0a0; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right; font-family: monospace;">${paymentId || orderId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="color: #666; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">Date:</td>
        <td style="color: #a0a0a0; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
      </tr>
      ${rankName && rankName !== 'one-time' ? `
      <tr>
        <td style="color: #666; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">Rank:</td>
        <td style="color: #8b5cf6; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">${rankName}</td>
      </tr>
      ` : ''}
      ${days ? `
      <tr>
        <td style="color: #666; padding: 8px 0;">Duration:</td>
        <td style="color: #a0a0a0; padding: 8px 0; text-align: right;">${days} days</td>
      </tr>
      ` : ''}
    </table>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      Your rank has been automatically applied to your account. You can check your rank status in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network'}/settings" style="color: #00ffff; text-decoration: none;">account settings</a>.
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network'}/donate" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%); color: #000; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View Your Donation History
      </a>
    </div>
    <p style="color: #666; font-size: 12px; margin-top: 24px; text-align: center;">
      This is your receipt for your donation. Please keep it for your records.<br>
      If you have any questions, please contact us.
    </p>
  `;

  return {
    subject: `🎉 Thank you for your $${amount.toFixed(2)} donation!`,
    html: getBaseEmailTemplate(content, 'Donation Receipt'),
    text: `Thank you for your $${amount.toFixed(2)} donation to Vonix Network!${rankName ? ` You received the ${rankName} rank for ${days || 30} days.` : ''} Transaction ID: ${paymentId || orderId || 'N/A'}`,
  };
}

/**
 * Send donation receipt to user
 */
export async function sendDonationReceiptEmail(options: {
  to: string;
  username: string;
  amount: number;
  rankName?: string;
  days?: number;
  paymentId?: string;
  orderId?: string;
}): Promise<boolean> {
  try {
    const { to, ...templateOptions } = options;
    const template = getDonationReceiptEmailTemplate(templateOptions);
    return await sendEmail(to, template);
  } catch (error: any) {
    console.error('Error sending donation receipt:', error);
    return false;
  }
}

// =============================================================================
// TICKET ACCESS EMAIL
// =============================================================================

/**
 * Ticket access email template (for guests)
 */
export function getTicketAccessEmailTemplate(
  name: string,
  ticketId: number,
  accessToken: string
): EmailTemplate {
  const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network'}/helpdesk/guest?token=${accessToken}`;

  const content = `
    <h2 style="color: #00ffff; font-size: 20px; margin: 0 0 16px 0;">
      🎫 Your Support Ticket Has Been Created
    </h2>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      Hey <strong style="color: #00ffff;">${name}</strong>, your support ticket #${ticketId} has been created successfully!
    </p>
    <div style="background: rgba(0, 255, 255, 0.1); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="color: #ffffff; font-size: 14px; margin: 0 0 16px 0;">
        Use the button below to access your ticket and view responses from our support team:
      </p>
      <div style="text-align: center;">
        <a href="${accessUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%); color: #000; font-weight: 600; text-decoration: none; border-radius: 8px; font-size: 16px;">
          View Your Ticket
        </a>
      </div>
    </div>
    <p style="color: #666; font-size: 12px; line-height: 1.6;">
      <strong>Important:</strong> This link is valid for 7 days. Keep this email safe - you'll need it to access your ticket.
    </p>
    <p style="color: #666; font-size: 12px; line-height: 1.6;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${accessUrl}" style="color: #00ffff; word-break: break-all;">${accessUrl}</a>
    </p>
  `;

  return {
    subject: `🎫 Your Support Ticket #${ticketId} - Vonix Network`,
    html: getBaseEmailTemplate(content, 'Support Ticket Access'),
    text: `Your support ticket #${ticketId} has been created. Access it here: ${accessUrl}`,
  };
}

/**
 * Send ticket access email to guest
 */
export async function sendTicketAccessEmail(
  email: string,
  name: string,
  ticketId: number,
  accessToken: string
): Promise<boolean> {
  try {
    const template = getTicketAccessEmailTemplate(name, ticketId, accessToken);
    return await sendEmail(email, template);
  } catch (error: any) {
    console.error('Error sending ticket access email:', error);
    return false;
  }
}

/**
 * Ticket reply notification email template (for guests)
 */
export function getTicketReplyEmailTemplate(
  name: string,
  ticketId: number,
  accessToken: string,
  staffName: string,
  replyPreview: string
): EmailTemplate {
  const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network'}/helpdesk/guest?token=${accessToken}`;

  const content = `
    <h2 style="color: #00ffff; font-size: 20px; margin: 0 0 16px 0;">
      💬 New Reply on Your Ticket #${ticketId}
    </h2>
    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
      Hey <strong style="color: #00ffff;">${name}</strong>, our support team has responded to your ticket!
    </p>
    <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; padding: 16px; margin: 20px 0;">
      <p style="color: #8b5cf6; font-size: 12px; margin: 0 0 8px 0; font-weight: 600;">
        ${staffName} replied:
      </p>
      <p style="color: #ffffff; font-size: 14px; margin: 0; line-height: 1.6;">
        ${replyPreview.substring(0, 300)}${replyPreview.length > 300 ? '...' : ''}
      </p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${accessUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%); color: #000; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View Full Conversation
      </a>
    </div>
  `;

  return {
    subject: `💬 New Reply on Ticket #${ticketId} - Vonix Network`,
    html: getBaseEmailTemplate(content, 'Ticket Reply'),
    text: `${staffName} replied to your ticket #${ticketId}. View the conversation: ${accessUrl}`,
  };
}

/**
 * Send ticket reply notification to guest
 */
export async function sendTicketReplyEmail(
  email: string,
  name: string,
  ticketId: number,
  accessToken: string,
  staffName: string,
  replyPreview: string
): Promise<boolean> {
  try {
    const template = getTicketReplyEmailTemplate(name, ticketId, accessToken, staffName, replyPreview);
    return await sendEmail(email, template);
  } catch (error: any) {
    console.error('Error sending ticket reply email:', error);
    return false;
  }
}

// Export for use in API routes
export default {
  sendEmail,
  isEmailConfigured,
  sendAdminErrorAlert,
  sendAdminDonationAlert,
  sendAdminNewUserAlert,
  sendUserNotificationEmail,
  sendDonationReceiptEmail,
  sendTicketAccessEmail,
  sendTicketReplyEmail,
  getNewMessageEmailTemplate,
  getForumReplyEmailTemplate,
  getFriendRequestEmailTemplate,
  getDonationReceiptEmailTemplate,
  getTicketAccessEmailTemplate,
  getTicketReplyEmailTemplate,
};
