# Vonix Network Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example file and configure minimal required variables:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-key-here

# Set to your domain
AUTH_URL=http://localhost:3000

# Trust all hosts
AUTH_TRUST_HOST=true

# Database (SQLite for development)
DATABASE_URL=file:./data/vonix.db
```

### 3. Initialize Database
```bash
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Complete Setup Wizard
1. Open http://localhost:3000
2. You'll be automatically redirected to `/setup`
3. Follow the wizard to:
   - Create admin account
   - Configure site settings
   - Optionally setup Stripe payments

## 📦 What's Stored in the Database?

All of these are configured via the `/setup` wizard:

- ✅ Admin account credentials
- ✅ Site name and description  
- ✅ Stripe payment keys (optional)
- ✅ Email settings (future)
- ✅ Security settings
- ✅ Feature flags

## 🔐 Minimal .env Configuration

Only 3 things are required in `.env.local`:

1. **NEXTAUTH_SECRET** - Session encryption key
2. **AUTH_URL** - Your domain URL
3. **DATABASE_URL** - Database connection string

Everything else is stored in the database and configured via the setup wizard!

## 🎨 Setup Wizard Features

### Step 1: Welcome
- Overview of the setup process
- Security features explained

### Step 2: Admin Account
- Create your superadmin account
- Username, email, and password
- Validates password strength

### Step 3: Site Settings  
- Configure site name
- Set site description
- These are stored in the database

### Step 4: Payment Setup (Optional)
- Enable Stripe payments
- Enter API keys securely
- Can be configured later in admin panel

## 🗄️ Database Schema Updates

New tables added for configuration:

### `siteSettings`
```sql
- key: unique setting identifier
- value: setting value
- category: general, payments, security, etc.
- description: what this setting does
- isPublic: can it be shown to users?
```

### `setupStatus`
```sql
- isCompleted: has setup wizard been completed?
- completedAt: when was setup finished?
- adminUsername: who completed setup
- version: application version
```

## 🔧 Admin Configuration

After setup is complete, you can manage settings in:

**Admin Panel → Settings** (`/admin/settings`)

Settings are organized by category:
- **General**: Site name, description, maintenance mode
- **Security**: Registration, rate limiting
- **Payments**: Stripe configuration
- **Notifications**: Email settings

## 🎯 Production Deployment

### Vercel
1. Set environment variables in Vercel dashboard:
   - `NEXTAUTH_SECRET`
   - `AUTH_URL` (your production domain)
   - `DATABASE_URL` (Turso connection string)
   - `DATABASE_AUTH_TOKEN` (Turso auth token)

2. Deploy: `vercel`

3. First visit will redirect to `/setup`

### Other Platforms
1. Configure environment variables
2. Run `npm run build`
3. Run `npm start`
4. Visit your domain and complete setup

## 🔄 Cron Jobs (Production)

Two automated tasks run via Vercel Cron:

### Expire Ranks (Hourly)
- Removes expired donation ranks
- Endpoint: `/api/cron/expire-ranks`
- Schedule: `0 * * * *`

### Update Servers (Every 5 minutes)
- Fetches Minecraft server status
- Endpoint: `/api/cron/update-servers`
- Schedule: `*/5 * * * *`

Configure `CRON_SECRET` in production for authentication.

## 📝 Post-Setup Checklist

After completing setup wizard:

- [ ] Create donation ranks in `/admin/donations`
- [ ] Add your Minecraft servers in `/admin/servers`
- [ ] Configure Stripe webhook if using payments
- [ ] Test registration flow
- [ ] Verify API keys for Minecraft mod
- [ ] Customize theme (optional)

## 🎮 Minecraft Integration

### API Keys
Generated in `/admin/api-keys`:
- Used by Minecraft mods to communicate with site
- Prefix: `vnx_`
- Required for player registration

### Registration Flow
1. Player joins Minecraft server
2. Mod generates registration code via API
3. Player visits site and registers with code
4. Account linked to Minecraft UUID

### Endpoints
- `POST /api/minecraft/register` - Generate registration code
- `POST /api/minecraft/verify` - Verify player login
- `POST /api/minecraft/xp` - Award XP

## 💳 Stripe Configuration

### Setup Webhook
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `payment_intent.succeeded`

4. Copy webhook secret to setup wizard or admin settings

### Test Mode
Use test keys during development:
- Secret: `sk_test_...`
- Publishable: `pk_test_...`
- Webhook Secret: `whsec_test_...`

## 🆘 Troubleshooting

### Setup wizard not appearing?
- Clear browser cache
- Check `.env.local` is configured
- Ensure database is initialized: `npm run db:push`

### 404 on routes?
- Restart dev server: Stop and run `npm run dev` again
- Check file structure in `src/app/`

### Database errors?
- Delete `data/vonix.db` and run `npm run db:push`
- This will reset all data (only do in development!)

### Stripe not working?
- Verify keys are correct in admin settings
- Check webhook is configured
- Test with Stripe test cards

## 🔗 Helpful Commands

```bash
# Development
npm run dev          # Start dev server with Turbo
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migrations
npm run db:studio    # Open Drizzle Studio (DB GUI)

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # Run TypeScript checks
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Stripe Documentation](https://stripe.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Need help?** Check the main README.md or open an issue on GitHub.
