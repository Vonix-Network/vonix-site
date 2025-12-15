import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, minecraftUsername, password, discordId, discordUsername, discordAvatar, email, avatar } = body;

        // Validate required fields - username OR minecraftUsername, plus password and Discord info
        if (!password || !discordId || !discordUsername) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Username is the primary identifier - use minecraftUsername if provided, otherwise username
        const finalUsername = (username || minecraftUsername || '')?.trim();
        if (!finalUsername || finalUsername.length < 3 || finalUsername.length > 20) {
            return NextResponse.json(
                { error: 'Username must be between 3 and 20 characters' },
                { status: 400 }
            );
        }

        // Validate Minecraft username format if provided (optional field)
        const finalMinecraftUsername = minecraftUsername?.trim() || null;
        if (finalMinecraftUsername) {
            if (finalMinecraftUsername.length < 3 || finalMinecraftUsername.length > 16) {
                return NextResponse.json(
                    { error: 'Minecraft username must be between 3 and 16 characters' },
                    { status: 400 }
                );
            }

            if (!/^[a-zA-Z0-9_]+$/.test(finalMinecraftUsername)) {
                return NextResponse.json(
                    { error: 'Minecraft username can only contain letters, numbers, and underscores' },
                    { status: 400 }
                );
            }
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Check if Discord OAuth registration is allowed
        const [oauthEnabledSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'discord_oauth_enabled'));

        if (oauthEnabledSetting?.value !== 'true') {
            return NextResponse.json(
                { error: 'Discord OAuth registration is not enabled' },
                { status: 403 }
            );
        }

        // Check registration settings
        const [registrationEnabledSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'discord_oauth_registration_enabled'));

        const [requireCodeSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'require_registration_code'));

        const oauthRegistrationEnabled = registrationEnabledSetting?.value === 'true';
        const requiresGameCode = requireCodeSetting?.value !== 'false';

        if (!oauthRegistrationEnabled && requiresGameCode) {
            return NextResponse.json(
                { error: 'Discord registration is not allowed. Please register through the Minecraft server.' },
                { status: 403 }
            );
        }

        // Check if Discord ID is already in use
        const existingDiscordUser = await db.query.users.findFirst({
            where: eq(users.discordId, discordId),
        });

        if (existingDiscordUser) {
            return NextResponse.json(
                { error: 'This Discord account is already linked to another user' },
                { status: 409 }
            );
        }

        // Check if username is already taken
        const existingUser = await db.query.users.findFirst({
            where: eq(users.username, finalUsername),
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'This username is already taken' },
                { status: 409 }
            );
        }

        // Check if email is already in use (if provided)
        if (email) {
            const existingEmailUser = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingEmailUser) {
                return NextResponse.json(
                    { error: 'This email is already associated with another account' },
                    { status: 409 }
                );
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const [newUser] = await db.insert(users).values({
            username: finalUsername,
            email: email || null,
            password: hashedPassword,
            minecraftUsername: finalMinecraftUsername,
            avatar: avatar?.trim() || null,
            discordId,
            discordUsername,
            discordAvatar,
            role: 'user',
            level: 1,
            xp: 0,
            websiteXp: 0,
            minecraftXp: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        // TODO: Assign Discord role if configured
        // const [registerRoleIdSetting] = await db
        //     .select()
        //     .from(siteSettings)
        //     .where(eq(siteSettings.key, 'discord_register_role_id'));
        // 
        // if (registerRoleIdSetting?.value) {
        //     // Call Discord API to assign role
        // }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
            },
        });
    } catch (error) {
        console.error('Error during Discord registration:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during registration' },
            { status: 500 }
        );
    }
}
