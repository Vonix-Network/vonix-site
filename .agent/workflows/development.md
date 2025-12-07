---
description: How to develop, build, and deploy the Vonix Network website
---

# Vonix Network Website Development Workflow

## Project Overview
This is a Next.js 15 application for the Vonix Network Minecraft community. It features user authentication, donation system, forum, Discord integration, and admin dashboard.

## Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS with custom neon theme
- **Payments**: Stripe
- **Real-time**: Socket.io

## Development Setup

### 1. Install dependencies
// turbo
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.example` to `.env.local` and fill in the required values:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret
- `STRIPE_*` - Stripe API keys
- `DISCORD_*` - Discord bot tokens and channel IDs

### 3. Start development server
// turbo
```bash
npm run dev
```

## Building for Production

### 1. Type check
// turbo
```bash
npx tsc --noEmit
```

### 2. Build production bundle
// turbo
```bash
npm run build
```

### 3. Start production server
```bash
npm run start
```

## Common Development Tasks

### Database Migrations
When schema changes are made in `src/db/schema.ts`:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Adding a new API endpoint
1. Create a new folder in `src/app/api/[endpoint-name]/`
2. Add `route.ts` with GET/POST/PUT/DELETE handlers
3. Use `auth()` wrapper for protected endpoints

### Adding a new page
1. Create a new folder in `src/app/[page-name]/`
2. Add `page.tsx` for the page component
3. Use `(dashboard)` or `(admin)` route groups for protected pages

## Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Utility functions and configurations
- `src/db/` - Database schema and connection
- `middleware.ts` - Authentication and maintenance mode logic

## Important Features

### Maintenance Mode
- Controlled via Admin Dashboard > Settings > General
- Blocks all user-facing pages, allows API endpoints
- Staff roles (admin, superadmin, moderator) can bypass

### Registration
- Can require Minecraft verification code (toggle in Admin > Settings > Security)
- Standard username/password registration when code requirement is off

### Discord Integration
- Chat widget connects to Discord channel
- Starts minimized by default
- Hidden on admin pages

## Deployment (AWS/Self-hosted)

### 1. Pull latest changes
// turbo
```bash
git pull origin main
```

### 2. Install dependencies
// turbo
```bash
npm install
```

### 3. Build
// turbo
```bash
npm run build
```

### 4. Run with PM2 or screen
```bash
pm2 start npm --name "vonix" -- start
# OR
screen -S vonix npm run start
```

## Cron Jobs
The following cron jobs should be set up:
- `/api/cron/expire-ranks` - Expires donation ranks (daily)
- `/api/cron/sync-usernames` - Syncs Minecraft usernames (hourly)
- `/api/cron/uptime` - Updates server uptime data (every 5 minutes)

All cron endpoints require `CRON_SECRET` authentication.

## Troubleshooting

### Build Errors
1. Run `npx tsc --noEmit` to check for TypeScript errors
2. Check for missing environment variables

### Database Connection Issues
1. Verify `DATABASE_URL` is correct
2. Check if PostgreSQL server is running
3. Run `npx drizzle-kit push` to sync schema

### Authentication Issues
1. Verify `AUTH_SECRET` is set
2. Check callback URLs in OAuth providers
3. Clear browser cookies and try again
