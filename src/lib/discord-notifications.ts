/**
 * Discord Donation Notifications
 * 
 * Sends donation announcements to a Discord webhook channel
 */

import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface DonationDetails {
    username: string;
    minecraftUsername?: string | null;
    amount: number;
    currency?: string;
    rankName?: string | null;
    days?: number | null;
    paymentType?: 'one_time' | 'subscription' | 'renewal' | 'subscription_renewal';
    message?: string | null;
}

/**
 * Get the donation webhook settings from database
 */
async function getDonationWebhookSettings(): Promise<{
    webhookUrl: string | null;
    avatarUrl: string | null;
}> {
    const settings = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'discord_donation_webhook_url'))
        .limit(1);

    const avatarSettings = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'discord_donation_webhook_avatar_url'))
        .limit(1);

    return {
        webhookUrl: settings[0]?.value || null,
        avatarUrl: avatarSettings[0]?.value || null,
    };
}

/**
 * Send a donation notification to Discord
 */
export async function sendDonationDiscordNotification(donation: DonationDetails): Promise<boolean> {
    try {
        const { webhookUrl, avatarUrl } = await getDonationWebhookSettings();

        // Skip if no webhook configured
        if (!webhookUrl) {
            console.log('No donation webhook configured, skipping notification');
            return false;
        }

        // Generate Minecraft avatar URL (using minotar.net armor view)
        const minecraftAvatarUrl = donation.minecraftUsername
            ? `https://minotar.net/armor/bust/${encodeURIComponent(donation.minecraftUsername)}/100.png`
            : null;

        // Build the embed
        const paymentTypeLabel = donation.paymentType === 'subscription'
            ? '📅 Monthly Subscription'
            : donation.paymentType === 'renewal' || donation.paymentType === 'subscription_renewal'
                ? '🔄 Renewal'
                : '💎 One-Time';

        const embed = {
            title: '💰 New Donation!',
            description: `**${donation.username}** just supported the server!`,
            color: 0x00FF88, // Neon green
            thumbnail: minecraftAvatarUrl ? { url: minecraftAvatarUrl } : undefined,
            fields: [
                {
                    name: '💵 Amount',
                    value: `$${donation.amount.toFixed(2)} ${donation.currency || 'USD'}`,
                    inline: true,
                },
                {
                    name: '📋 Type',
                    value: paymentTypeLabel,
                    inline: true,
                },
            ],
            footer: {
                text: 'Vonix Network',
            },
            timestamp: new Date().toISOString(),
        };

        // Add rank field if applicable
        if (donation.rankName && donation.rankName !== 'one-time') {
            embed.fields.push({
                name: '👑 Rank',
                value: donation.rankName,
                inline: true,
            });
        }

        // Add duration if applicable
        if (donation.days && donation.days > 0) {
            embed.fields.push({
                name: '⏱️ Duration',
                value: `${donation.days} days`,
                inline: true,
            });
        }

        // Add message if provided
        if (donation.message) {
            embed.fields.push({
                name: '💬 Message',
                value: donation.message,
                inline: false,
            });
        }

        // Send to Discord webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'Vonix Donations',
                avatar_url: avatarUrl || undefined,
                embeds: [embed],
            }),
        });

        if (!response.ok) {
            console.error('Discord webhook error:', response.status, await response.text());
            return false;
        }

        console.log('✅ Donation notification sent to Discord');
        return true;
    } catch (error: any) {
        console.error('Error sending donation Discord notification:', error);
        return false;
    }
}
