# 🚀 Discord Integration - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Discord Developer Portal (2 min)
1. Go to https://discord.com/developers/applications
2. Create new application
3. **Bot tab:** Enable Server Members + Message Content intents
4. Copy: Bot Token, Client ID, Client Secret
5. **OAuth2 tab:** Add redirect: `https://yourdomain.com/api/auth/callback/discord`
6. **OAuth2 > URL Generator:** Select bot + applications.commands, add to server

### 2. Environment Variables (30 sec)
Add to `.env.local`:
```env
DISCORD_CLIENT_ID=paste_here
DISCORD_CLIENT_SECRET=paste_here
```

### 3. Admin Dashboard (1 min)
**Admin > Settings > Discord:**
- Discord Bot Token: `paste_bot_token`
- Discord Client ID: `paste_client_id`
- Discord Client Secret: `paste_client_secret`
- Discord Guild ID: `right_click_server > copy_id`

### 4. Discord Server (1 min)
1. Create forum channel for tickets
2. Run: `/ticketsetup`
3. Select the forum channel

### 5. Donation Ranks (30 sec)
**Admin > Donation Ranks:**
- For each rank: Add Discord Role ID
- Right-click role in Discord > Copy ID

### 6. Restart Server (30 sec)
```bash
npm run dev
```

---

## ✅ Verification Checklist

- [ ] Bot shows online in Discord
- [ ] Console shows: "Discord integration client initialized"
- [ ] `/ticketsetup` command appears in Discord
- [ ] "Link Discord" button appears in user settings
- [ ] Create test ticket → Discord thread appears
- [ ] Send message in Discord → Appears on website
- [ ] Purchase rank → Discord role assigned

---

## 🎯 What Each Feature Does

### Discord OAuth
**User clicks "Link Discord" → Authorizes → Account linked**
- Discord profile synced to website
- Enables automatic role assignment

### Ticket Threading
**User creates ticket → Discord thread created → Messages sync both ways**
- Staff can respond from Discord or website
- Thread closes when ticket is resolved

### Role Management
**User buys rank → Discord role assigned → Role removed on expiration**
- Works with Stripe, Square, Ko-Fi
- Automatic, no manual work needed

---

## 🔧 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| OAuth fails | Check redirect URL matches exactly |
| Threads don't create | Run `/ticketsetup` command |
| Roles don't assign | Verify bot role is higher than donation roles |
| Bot offline | Check bot token in admin dashboard |
| Messages don't sync | Enable Message Content Intent |

---

## 📞 Need Help?

1. Check `DISCORD_INTEGRATION_SETUP.md` for detailed guide
2. Review server console logs
3. Verify all permissions enabled
4. Test with fresh Discord account

---

## 🎉 You're Done!

Your Discord integration is live with:
- ✅ Account linking
- ✅ Ticket threading
- ✅ Automatic role management

**Total setup time:** ~5 minutes  
**Manual work saved:** Countless hours  
**User experience:** Seamless ✨
