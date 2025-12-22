# Vonix Network - Rebuilt

A modern, secure Minecraft community platform with a stunning Neon Rainbow theme.

## Features

- **User Authentication**: Secure login with NextAuth.js, rate limiting, and account lockout protection
- **Player Profiles**: Detailed user profiles with stats, ranks, XP, and achievements
- **Server List**: Real-time server status and player counts
- **Forum**: Community discussion forums with categories, posts, and replies
- **Social Feed**: Twitter-like social feed for user posts and interactions
- **Leaderboards**: Ranking of top players based on various metrics
- **Donations & Subscriptions**: Stripe integration for donations and rank subscriptions
- **Admin Dashboard**: Powerful tools for staff to manage the community
- **XP & Leveling System**: Gamification with XP, levels, and achievements
- **Groups & Guilds**: Create and manage community groups
- **Events**: Schedule and manage community events
- **Moderation Tools**: Report system and content moderation

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom Neon Rainbow theme
- **UI Components**: Custom components with Radix UI primitives
- **Authentication**: [NextAuth.js v5](https://authjs.dev/)
- **Database**: SQLite with [Drizzle ORM](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/) or [Ko-Fi](https://ko-fi.com/) (configurable)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query)

## Security Features

- **Government-grade security headers** (CSP, HSTS, X-Frame-Options, etc.)
- **Rate limiting** on authentication endpoints
- **Account lockout** after failed login attempts
- **Audit logging** for sensitive operations
- **CSRF protection**
- **Input validation** with Zod
- **Secure session management**

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

3. **Initialize the database**:
   ```bash
   npm run db:push
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** to `http://localhost:3000`

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

- `NEXTAUTH_SECRET`: Secret for session encryption (generate with `openssl rand -base64 32`)
- `DATABASE_URL`: Database connection string

### Optional Variables

- `STRIPE_SECRET_KEY`: Stripe API key for payments
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `DISCORD_TOKEN`: Discord bot token for integration

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (admin)/        # Admin dashboard routes
│   ├── (auth)/         # Authentication routes
│   ├── (dashboard)/    # User dashboard routes
│   ├── (public)/       # Public routes
│   └── api/            # API routes
├── components/         # React components
│   ├── layout/         # Layout components
│   └── ui/             # UI primitives
├── db/                 # Database schema and utilities
├── lib/                # Utility functions
└── types/              # TypeScript types
```

## Design Theme

The Neon Rainbow theme is inspired by the Vonix logo, featuring:

- **Primary Colors**: Cyan (#00D9FF) → Purple (#8B5CF6) → Pink (#EC4899)
- **Dark Background**: Deep dark (#0a0a0f) for maximum neon contrast
- **Glass Morphism**: Frosted glass effects with backdrop blur
- **Neon Glow Effects**: Animated glows and shadows
- **Gradient Animations**: Smooth color transitions

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Documentation

Additional documentation is available in the `docs/` folder:

- [Discord Integration Setup](docs/DISCORD_INTEGRATION_SETUP.md) - Complete Discord bot setup guide
- [Discord Ticket System](docs/Discord_Ticket_Guide.MD) - Ticket commands and configuration
- [Minecraft Integration](docs/MINECRAFT-INTEGRATION.md) - Minecraft username system and API
- [Rank System](docs/RANKS.md) - Donation ranks, Stripe payments, and badges

For deployment instructions, see [SETUP.md](SETUP.md).

## License

MIT License - See LICENSE file for details.

## Author

Richard Cooper - [Vonix Network](https://vonix.network)

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Might Soon Be Powered by DartNode - Free VPS for Open Source")