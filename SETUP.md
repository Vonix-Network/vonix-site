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

### Self-Hosted (Ubuntu/AWS)

#### 1. Install Node.js 20+
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Clone and Install
```bash
git clone <your-repo-url> /var/www/vonix
cd /var/www/vonix
npm install
```

#### 3. Configure Environment
```bash
cp .env.example .env.local
nano .env.local
```

Required variables for production:
```env
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-key-here

# Your production domain
AUTH_URL=https://vonix.network
AUTH_TRUST_HOST=true

# Database - Turso (recommended for production)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your_turso_token

# OR Local SQLite (not recommended for production)
# DATABASE_URL=file:./data/vonix.db

# Cron secret - generate with: openssl rand -base64 32
CRON_SECRET=your-cron-secret-here

# App URL
NEXT_PUBLIC_APP_URL=https://vonix.network
```

#### 4. Build Application
```bash
npm run db:push  # Initialize database
npm run build    # Build for production
```

#### 5. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

#### 6. Create PM2 Ecosystem File
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'vonix-network',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/vonix',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
```

#### 7. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-start on reboot
```

#### 8. Setup Nginx Reverse Proxy
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/vonix
```

```nginx
server {
    listen 80;
    server_name vonix.network www.vonix.network;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vonix /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 9. Setup SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vonix.network -d www.vonix.network
```

## 🔄 Cron Jobs (Self-Hosted)

Since you're self-hosting, you need to set up cron jobs manually using crontab.

### Setup Crontab
```bash
crontab -e
```

Add these lines (replace `YOUR_CRON_SECRET` with your actual `CRON_SECRET` value):

```cron
# Vonix Network Cron Jobs

# Server Uptime Check - Every minute (pings servers, records uptime data)
* * * * * curl -s "https://vonix.network/api/cron/uptime?secret=YOUR_CRON_SECRET" > /dev/null 2>&1

# Expire Ranks - Every hour (removes expired donation ranks)
0 * * * * curl -s "https://vonix.network/api/cron/expire-ranks?secret=YOUR_CRON_SECRET" > /dev/null 2>&1
```

### Alternative: With Headers
If you prefer using headers instead of query params:
```cron
* * * * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" "https://vonix.network/api/cron/uptime" > /dev/null 2>&1
```

### Verify Cron is Running
```bash
# Check cron logs
grep CRON /var/log/syslog | tail -20

# Test manually
curl "https://vonix.network/api/cron/uptime?secret=YOUR_CRON_SECRET"
```

## 📊 Useful PM2 Commands

```bash
pm2 status              # Check app status
pm2 logs vonix-network  # View logs
pm2 restart all         # Restart app
pm2 reload all          # Zero-downtime reload
pm2 monit               # Real-time monitoring
```

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
