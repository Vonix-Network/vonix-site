# Vonix Network - Ubuntu Auto-Start Guide (Screen Session)

This guide covers setting up Vonix Network to automatically start on system boot inside a **screen session** that the `ubuntu` user can attach to for viewing the live console output.

## Prerequisites

- Ubuntu 20.04 or newer
- Node.js 20+ installed
- Application built and ready (`npm run build` completed)
- Application directory: `/var/www/vonix` (or your preferred location)
- `screen` installed (usually pre-installed on Ubuntu)

---

## Step 1: Install Screen (if not already installed)

```bash
# Install screen
sudo apt update
sudo apt install screen -y

# Verify installation
screen --version
```

---

## Step 2: Create Application Directory

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

## Step 3: Install Dependencies and Build

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

## Step 4: Create the Startup Script

Create a startup script that will run the application inside a screen session:

```bash
nano /var/www/vonix/start-vonix.sh
```

Paste the following content:

```bash
#!/bin/bash
# Vonix Network Startup Script - Runs in a screen session

SESSION_NAME="vonix"
WORK_DIR="/var/www/vonix"

# Kill existing session if it exists
screen -S "$SESSION_NAME" -X quit 2>/dev/null

# Wait a moment for cleanup
sleep 1

# Start a new detached screen session running npm start
cd "$WORK_DIR"
screen -dmS "$SESSION_NAME" bash -c "cd $WORK_DIR && npm start; exec bash"

echo "✅ Vonix started in screen session '$SESSION_NAME'"
echo "   To view console: screen -r $SESSION_NAME"
echo "   To detach: Press Ctrl+A, then D"
```

Make it executable:

```bash
chmod +x /var/www/vonix/start-vonix.sh
```

---

## Step 5: Create Systemd Service for Auto-Start with Screen

Create a systemd service that starts the screen session on boot:

```bash
sudo nano /etc/systemd/system/vonix.service
```

Paste the following content:

```ini
[Unit]
Description=Vonix Network Website (Screen Session)
Documentation=https://github.com/Vonix-Network/vonix-site
After=network.target

[Service]
Type=forking
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/vonix

# Start the application in a screen session
ExecStart=/usr/bin/screen -dmS vonix bash -c "cd /var/www/vonix && NODE_ENV=production PORT=3000 npm start"

# Stop by sending quit to the screen session
ExecStop=/usr/bin/screen -S vonix -X quit

# Restart configuration
Restart=on-failure
RestartSec=10

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOME=/home/ubuntu

[Install]
WantedBy=multi-user.target
```

---

## Step 6: Enable and Start the Service

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

---

## Step 7: Accessing the Console

The main advantage of using screen is that you can attach to the session and see live console output:

### View Live Console

```bash
# Attach to the screen session (as ubuntu user)
screen -r vonix
```

### Detach from Session (Leave Running)

While attached to the screen session, press:
```
Ctrl+A, then D
```

This detaches you from the session while leaving the application running.

### List Active Screen Sessions

```bash
screen -ls
```

### Force Reattach (if session shows as "Attached")

```bash
screen -d -r vonix
```

---

## Step 8: Setup Cron Jobs

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

## Step 9: Setup Nginx Reverse Proxy (Recommended)

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

## Step 10: Setup SSL with Certbot

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

### Screen Session Management

```bash
# View console (attach to session)
screen -r vonix

# Detach from session (Ctrl+A, then D)

# List all screen sessions
screen -ls

# Force reattach if shown as "Attached"
screen -d -r vonix

# Kill the screen session manually
screen -S vonix -X quit
```

### Service Management

```bash
# Check status
sudo systemctl status vonix

# Restart service (restarts screen session)
sudo systemctl restart vonix

# Stop service (kills screen session)
sudo systemctl stop vonix

# Start service
sudo systemctl start vonix

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

# Restart service (starts new screen session)
sudo systemctl start vonix

# Verify it's running
screen -ls
```

### Quick Update Script

Create `/var/www/vonix/update.sh`:

```bash
#!/bin/bash
echo "🔄 Updating Vonix Network..."

cd /var/www/vonix

echo "⏹️ Stopping service..."
sudo systemctl stop vonix

echo "📥 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "🗄️ Pushing database changes..."
npm run db:push

echo "🔄 Starting service..."
sudo systemctl start vonix

sleep 2

echo "✅ Update complete!"
echo ""
echo "Screen sessions:"
screen -ls
echo ""
echo "To view console: screen -r vonix"
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

### Screen Session Not Starting

```bash
# Check if screen is installed
which screen

# Check systemd logs
sudo journalctl -u vonix -n 50 --no-pager

# Try starting manually
cd /var/www/vonix
screen -dmS vonix npm start
screen -ls
```

### Cannot Attach to Screen Session

```bash
# List sessions
screen -ls

# If it shows "Attached", force detach and reattach
screen -d -r vonix

# If it shows "Dead", clean up and restart
screen -wipe
sudo systemctl restart vonix
```

### Console Shows Errors

```bash
# Attach to see the errors
screen -r vonix

# Common issues:
# - Missing node_modules: Run `npm install`
# - Missing .env.local: Copy from .env.example
# - Port already in use: Check with `sudo lsof -i :3000`
```

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Restart the service
sudo systemctl restart vonix
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /var/www/vonix

# Fix permissions
chmod -R 755 /var/www/vonix
chmod 600 /var/www/vonix/.env.local
```

### Nginx 502 Bad Gateway

```bash
# Check if Node.js app is running
curl http://127.0.0.1:3000

# Check screen session
screen -ls

# If no session, restart the service
sudo systemctl restart vonix

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

- [ ] Screen installed (`apt install screen`)
- [ ] Application directory created at `/var/www/vonix`
- [ ] Correct ownership set (`chown -R ubuntu:ubuntu`)
- [ ] Dependencies installed (`npm install`)
- [ ] Environment file configured (`.env.local`)
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Application built (`npm run build`)
- [ ] Systemd service file created (with screen)
- [ ] Service enabled (`systemctl enable vonix`)
- [ ] Service started and running (`systemctl start vonix`)
- [ ] Screen session accessible (`screen -r vonix`)
- [ ] Cron jobs configured
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained
- [ ] Firewall configured
- [ ] First-time setup wizard completed in browser

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| View console | `screen -r vonix` |
| Detach from console | `Ctrl+A`, then `D` |
| Check if running | `screen -ls` |
| Restart application | `sudo systemctl restart vonix` |
| Stop application | `sudo systemctl stop vonix` |
| Start application | `sudo systemctl start vonix` |
| View service status | `sudo systemctl status vonix` |
| Force reattach | `screen -d -r vonix` |

---

## Support

For issues or questions, check the main `SETUP.md` or open an issue on GitHub.
