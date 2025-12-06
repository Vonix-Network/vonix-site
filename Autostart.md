# Vonix Network - Ubuntu Auto-Start Guide

This guide covers setting up Vonix Network to automatically start on system boot using **systemd** with proper permissions, logging, and reliability.

## Prerequisites

- Ubuntu 20.04 or newer (or any systemd-based Linux)
- Node.js 20+ installed
- Application built and ready (`npm run build` completed)
- Application directory: `/var/www/vonix` (or your preferred location)

---

## Step 1: Create Application Directory

```bash
# Create the application directory
sudo mkdir -p /var/www/vonix

# Clone your repository (or copy files)
cd /var/www/vonix
sudo git clone https://github.com/Vonix-Network/vonix-site.git .

# Set ownership to your user (replace 'ubuntu' with your username)
sudo chown -R ubuntu:ubuntu /var/www/vonix
```

---

## Step 2: Install Dependencies and Build

```bash
cd /var/www/vonix

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
nano .env.local  # Edit with your settings

# Push database schema (if using Turso)
npm run db:push

# Build the application
npm run build
```

---

## Step 3: Create Systemd Service File

Create the service file:

```bash
sudo nano /etc/systemd/system/vonix.service
```

Paste the following content (replace `ubuntu` with your actual username):

```ini
[Unit]
Description=Vonix Network Website
Documentation=https://github.com/Vonix-Network/vonix-site
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/vonix
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vonix

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/www/vonix/data
PrivateTmp=true

# Resource limits
LimitNOFILE=65535
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

---

## Step 4: Set Correct Permissions

```bash
# Ensure the application directory is owned by your user
sudo chown -R ubuntu:ubuntu /var/www/vonix

# Ensure data directory exists and is writable (for SQLite if used)
mkdir -p /var/www/vonix/data
chmod 755 /var/www/vonix/data

# Make sure node_modules is present
cd /var/www/vonix && npm install --production

# Verify the service file
sudo chmod 644 /etc/systemd/system/vonix.service
```

---

## Step 5: Enable and Start the Service

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable vonix

# Start the service now
sudo systemctl start vonix

# Check status
sudo systemctl status vonix
```

You should see output similar to:
```
● vonix.service - Vonix Network Website
     Loaded: loaded (/etc/systemd/system/vonix.service; enabled)
     Active: active (running) since ...
```

---

## Step 6: Setup Cron Jobs

The application needs scheduled tasks for uptime monitoring and rank expiration.

### Get Your Cron Key

1. Visit **Admin → API Keys** in your admin panel
2. Find the **Cron Job Authentication** section
3. Copy the auto-generated cron key

### Add Cron Jobs

```bash
# Open crontab editor
crontab -e
```

Add these lines (replace `YOUR_CRON_KEY` with your actual key):

```cron
# Vonix Network Scheduled Tasks

# Server Uptime Check - Every minute
* * * * * curl -s "https://yourdomain.com/api/cron/uptime?secret=YOUR_CRON_KEY" > /dev/null 2>&1

# Expire Donation Ranks - Every hour
0 * * * * curl -s "https://yourdomain.com/api/cron/expire-ranks?secret=YOUR_CRON_KEY" > /dev/null 2>&1
```

### Verify Cron is Running

```bash
# Check cron logs
grep CRON /var/log/syslog | tail -20

# Test endpoints manually
curl "https://yourdomain.com/api/cron/uptime?secret=YOUR_CRON_KEY"
```

---

## Step 7: Setup Nginx Reverse Proxy (Recommended)

### Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/vonix
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL is setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/vonix /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 8: Setup SSL with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test it with:
sudo certbot renew --dry-run
```

---

## Useful Commands

### Service Management

```bash
# Check status
sudo systemctl status vonix

# View logs
sudo journalctl -u vonix -f           # Follow logs
sudo journalctl -u vonix --since "1 hour ago"
sudo journalctl -u vonix -n 100       # Last 100 lines

# Restart service
sudo systemctl restart vonix

# Stop service
sudo systemctl stop vonix

# Disable auto-start
sudo systemctl disable vonix
```

### Application Updates

```bash
# Stop the service
sudo systemctl stop vonix

# Pull updates
cd /var/www/vonix
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Push database changes (if any)
npm run db:push

# Restart service
sudo systemctl start vonix
```

### Quick Update Script

Create `/var/www/vonix/update.sh`:

```bash
#!/bin/bash
echo "🔄 Updating Vonix Network..."

cd /var/www/vonix

echo "📥 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "🗄️ Pushing database changes..."
npm run db:push

echo "🔄 Restarting service..."
sudo systemctl restart vonix

echo "✅ Update complete!"
sudo systemctl status vonix
```

Make it executable:
```bash
chmod +x /var/www/vonix/update.sh
```

Run updates with:
```bash
/var/www/vonix/update.sh
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check detailed status
sudo systemctl status vonix -l

# Check logs for errors
sudo journalctl -u vonix -n 50 --no-pager

# Common issues:
# - Missing node_modules: Run `npm install`
# - Missing .env.local: Copy from .env.example
# - Port already in use: Check with `sudo lsof -i :3000`
# - Permission denied: Check ownership with `ls -la /var/www/vonix`
```

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /var/www/vonix

# Fix permissions
chmod -R 755 /var/www/vonix
chmod 600 /var/www/vonix/.env.local
```

### Database Connection Issues

```bash
# For Turso: Verify token hasn't expired
# Check .env.local has correct DATABASE_URL and DATABASE_AUTH_TOKEN

# For SQLite: Ensure data directory is writable
mkdir -p /var/www/vonix/data
chmod 755 /var/www/vonix/data
```

### Nginx 502 Bad Gateway

```bash
# Check if Node.js app is running
curl http://127.0.0.1:3000

# If not, check vonix service
sudo systemctl status vonix

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

---

## Security Recommendations

1. **Firewall Setup**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Fail2ban for SSH protection**
   ```bash
   sudo apt install fail2ban -y
   sudo systemctl enable fail2ban
   ```

3. **Keep Node.js Updated**
   ```bash
   # Check current version
   node --version
   
   # Update via NodeSource
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Complete Checklist

- [ ] Application directory created at `/var/www/vonix`
- [ ] Correct ownership set (`chown -R ubuntu:ubuntu`)
- [ ] Dependencies installed (`npm install`)
- [ ] Environment file configured (`.env.local`)
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Application built (`npm run build`)
- [ ] Systemd service file created
- [ ] Service enabled (`systemctl enable vonix`)
- [ ] Service started and running (`systemctl start vonix`)
- [ ] Cron jobs configured
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained
- [ ] Firewall configured
- [ ] First-time setup wizard completed in browser

---

## Support

For issues or questions, check the main `SETUP.md` or open an issue on GitHub.
