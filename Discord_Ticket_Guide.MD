# Discord Ticket System Guide

A comprehensive guide to the Vonix Network Discord ticket system, including all commands, features, and user/admin differences.

---

## Table of Contents

1. [Overview](#overview)
2. [User Commands](#user-commands)
3. [Staff Commands](#staff-commands)
4. [Admin Commands](#admin-commands)
5. [Ticket Panel](#ticket-panel)
6. [Ticket Lifecycle](#ticket-lifecycle)
7. [Guest Tickets (Website)](#guest-tickets-website)
8. [Admin Settings](#admin-settings)
9. [Database Schema](#database-schema)

---

## Overview

The ticket system allows users to create support tickets through Discord or the website. Tickets are managed as private Discord channels where users can communicate with staff.

### Key Features
- **Discord Integration**: Tickets create private channels in Discord
- **Category System**: Multiple support departments/categories
- **Priority Levels**: Urgent, High, Normal, Low (with emoji indicators)
- **Claiming**: Staff can claim tickets to handle exclusively
- **Transcripts**: Export ticket conversations as markdown
- **Guest Support**: Website visitors can create tickets without an account
- **Feedback**: Users can rate their support experience

---

## User Commands

These commands are available to **all Discord users**:

### `/new`
Create a new support ticket.

```
/new [topic]
```

| Option | Required | Description |
|--------|----------|-------------|
| topic | No | Brief description of your issue |

**Flow:**
1. User runs `/new` or clicks "Create Ticket" button
2. Modal appears asking for topic (if not provided)
3. Private channel created with user + staff access
4. Opening message posted with claim/close buttons

**Limits:**
- Maximum 3 open tickets per user

---

### `/close`
Close the current ticket (must be in a ticket channel).

```
/close [reason]
```

| Option | Required | Description |
|--------|----------|-------------|
| reason | No | Reason for closing |

**Flow (for ticket owner):**
1. User runs `/close`
2. Feedback modal appears (rating 1-5, optional comment)
3. After feedback, ticket is closed
4. Channel deleted after 5 seconds

**Note:** Ticket owners see a feedback modal. Staff can close without feedback.

---

### `/tickets`
List your open tickets.

```
/tickets
```

Shows up to 10 of your open tickets with:
- Ticket ID and subject
- Priority level
- Creation time

---

### `/transcript`
Get a transcript of a ticket conversation.

```
/transcript [ticket_id]
```

| Option | Required | Description |
|--------|----------|-------------|
| ticket_id | No | Ticket ID (defaults to current channel) |

**Output:** Markdown file download containing all messages.

**Permissions:** Only ticket owner or staff can view transcripts.

---

## Staff Commands

These commands require the **Staff Role** (configured in admin settings):

### `/claim`
Claim a ticket to handle it exclusively.

```
/claim
```

**Effects:**
- Hides ticket from other staff members
- Shows "Unclaim" button on opening message
- Sets ticket status to "In Progress"

---

### `/release`
Release a claimed ticket so others can help.

```
/release
```

**Effects:**
- Restores ticket visibility to all staff
- Shows "Claim" button on opening message
- Sets ticket status back to "Open"

---

### `/add`
Add a member to the ticket channel.

```
/add <member>
```

| Option | Required | Description |
|--------|----------|-------------|
| member | Yes | User to add |

**Use case:** Bringing in another user or specialist.

---

### `/remove`
Remove a member from the ticket channel.

```
/remove <member>
```

| Option | Required | Description |
|--------|----------|-------------|
| member | Yes | User to remove |

**Restrictions:** Cannot remove ticket owner or the bot.

---

### `/transfer`
Transfer ticket ownership to another user.

```
/transfer <member>
```

| Option | Required | Description |
|--------|----------|-------------|
| member | Yes | New ticket owner |

**Effects:**
- Updates ticket owner in database
- Renames channel to reflect new owner
- Grants new owner full permissions

---

### `/priority`
Set the ticket priority level.

```
/priority <level>
```

| Option | Required | Description |
|--------|----------|-------------|
| level | Yes | urgent, high, normal, or low |

**Priority Indicators:**
| Priority | Emoji | Color |
|----------|-------|-------|
| Urgent | 🔴 | Red |
| High | 🟠 | Orange |
| Normal | 🔵 | Blue |
| Low | 🟢 | Green |

The emoji is prepended to the channel name for visibility.

---

## Admin Commands

These commands require **Administrator** permission:

### `/panel`
Create a ticket creation panel in a channel.

```
/panel [channel] [title] [description]
```

| Option | Required | Description |
|--------|----------|-------------|
| channel | No | Target channel (defaults to current) |
| title | No | Panel title (default: "Support Tickets") |
| description | No | Panel description |

**Creates:**
- Embed with ticket information
- Category selector dropdown (if categories exist)
- "Create Ticket" button

---

### `/setup`
Configure the ticket system.

```
/setup [category] [staff_role]
```

| Option | Required | Description |
|--------|----------|-------------|
| category | No | Discord category for ticket channels |
| staff_role | No | Role that can see/manage tickets |

**Saves settings to database for persistence.**

---

## Ticket Panel

The ticket panel is an embed message with interactive components:

### Components

1. **Category Dropdown** (if multiple categories exist)
   - Lists all enabled categories
   - Shows emoji, name, and description
   - Selecting a category opens the topic modal

2. **Create Ticket Button**
   - Opens topic modal
   - Creates ticket in default category

### Topic Modal

When creating a ticket, users see a modal with:
- **Topic field**: "What do you need help with?"
- Required, max 1000 characters

---

## Ticket Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        TICKET CREATED                            │
│   User: /new or clicks button                                   │
│   System: Creates channel, posts opening message                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STATUS: OPEN                             │
│   - Visible to all staff                                        │
│   - User describes issue                                        │
│   - Buttons: [Claim] [Close]                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   STATUS: IN_PROGRESS   │     │   User closes ticket    │
│   Staff claimed ticket  │     │   → Feedback modal      │
│   Only claimer can see  │     │   → Ticket closed       │
│   Buttons: [Unclaim]    │     └─────────────────────────┘
│            [Close]      │
└─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       STATUS: WAITING                            │
│   Staff replied, waiting for user response                      │
│   Auto-changes to OPEN when user replies                        │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       STATUS: CLOSED                             │
│   - Closing message posted                                      │
│   - Channel deleted after 5 seconds                             │
│   - Transcript available via /transcript                        │
└─────────────────────────────────────────────────────────────────┘
```

### Status Transitions

| From | To | Trigger |
|------|-----|---------|
| - | Open | Ticket created |
| Open | In Progress | Staff claims ticket |
| Open | Waiting | Staff sends message |
| In Progress | Open | Staff releases ticket |
| Waiting | Open | User sends message |
| Any | Closed | /close command or button |

---

## Guest Tickets (Website)

Users without an account can create tickets via the website.

### Creating a Guest Ticket

**URL:** `/helpdesk/guest/new`

**Required Fields:**
- Email address
- Name
- Subject
- Category
- Priority
- Message

**Flow:**
1. Guest fills out form
2. Ticket created in database
3. Access token generated (valid 7 days)
4. Email sent with access link
5. Discord thread created (if configured)

### Accessing Guest Tickets

**URL:** `/helpdesk/guest?token=<access_token>`

**Features:**
- View ticket details and status
- Read all messages
- Reply to ticket
- Cannot reply if ticket is closed

### Resending Access Link

**URL:** `/helpdesk/guest` (without token)

- Enter email address
- System sends new access link if ticket exists

---

## Admin Settings

Access via: **Admin Panel → Settings → Discord**

### Discord OAuth2 Login
| Setting | Description |
|---------|-------------|
| Enable OAuth Login | Allow Discord account linking |
| OAuth Client ID | From Discord Developer Portal |
| OAuth Client Secret | From Discord Developer Portal |
| OAuth Redirect URI | Callback URL for OAuth flow |

### Discord Ticket System
| Setting | Description |
|---------|-------------|
| Ticket Forum Channel ID | Forum for ticket threads |
| Ticket Category ID | Discord category for ticket channels |
| Staff Role ID | Role that can see/manage tickets |
| Ping Role ID | Role pinged on new tickets |

### Additional Settings
| Setting | Description |
|---------|-------------|
| Bot Token | Discord bot token |
| Client ID | Application ID for slash commands |
| Guild ID | Server ID for slash commands |

---

## Database Schema

### Main Tables

#### `supportTickets`
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| userId | int | Website user (if logged in) |
| categoryId | int | Ticket category |
| subject | string | Ticket subject |
| category | enum | account/billing/technical/general/other |
| priority | enum | low/normal/high/urgent |
| status | enum | open/in_progress/waiting/resolved/closed |
| discordChannelId | string | Discord channel ID |
| discordUserId | string | Discord user ID |
| discordUsername | string | Discord username |
| guestEmail | string | Guest email (if guest ticket) |
| guestName | string | Guest name |
| guestAccessToken | string | Access token for guests |
| claimedById | int | Staff who claimed ticket |
| firstResponseAt | timestamp | When staff first replied |
| closedAt | timestamp | When ticket was closed |
| closedReason | string | Reason for closing |

#### `ticketMessages`
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| ticketId | int | Parent ticket |
| userId | int | Website user |
| discordUserId | string | Discord user ID |
| discordUsername | string | Discord username |
| guestName | string | Guest name |
| message | string | Message content |
| isStaffReply | boolean | If sent by staff |
| isSystemMessage | boolean | If system-generated |

#### `ticketCategories`
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| name | string | Category name |
| description | string | Category description |
| emoji | string | Display emoji |
| color | string | Hex color |
| staffRoles | JSON | Staff roles for this category |
| pingRoles | JSON | Roles to ping |
| memberLimit | int | Max tickets per user |
| totalLimit | int | Max total tickets |
| cooldown | int | Seconds between tickets |
| enabled | boolean | If category is active |

---

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/discord-tickets.ts` | Main ticket system implementation |
| `src/lib/discord-integration.ts` | Discord client & legacy integration |
| `src/lib/email.ts` | Email templates for guest tickets |
| `src/db/schema.ts` | Database schema definitions |
| `src/app/api/tickets/guest/*` | Guest ticket API routes |
| `src/app/helpdesk/guest/*` | Guest ticket pages |
| `src/app/(admin)/admin/settings/page.tsx` | Admin settings UI |

---

## Verification Report: Implementation vs DiscordTicketBot

### ✅ IMPLEMENTED (Matches Reference)

| Feature | Status | Notes |
|---------|--------|-------|
| `/new` command | ✅ | Creates ticket with topic |
| `/close` command | ✅ | Closes with reason |
| `/claim` command | ✅ | Staff claims ticket |
| `/release` command | ✅ | Staff releases ticket |
| `/add` command | ✅ | Add member to ticket |
| `/remove` command | ✅ | Remove member from ticket |
| `/transfer` command | ✅ | Transfer ownership |
| `/priority` command | ✅ | Set priority with emoji |
| `/tickets` command | ✅ | List user's tickets |
| `/transcript` command | ✅ | Export as markdown |
| Create button | ✅ | Opens topic modal |
| Close button | ✅ | On opening message |
| Claim button | ✅ | On opening message |
| Category selector | ✅ | Dropdown menu |
| Topic modal | ✅ | For ticket creation |
| Feedback modal | ✅ | Rating + comment |
| Channel permissions | ✅ | Staff/user access |
| Priority emoji in name | ✅ | 🔴🟠🔵🟢 |
| Message syncing | ✅ | Discord ↔ Database |
| First response tracking | ✅ | `firstResponseAt` field |
| Status transitions | ✅ | open→waiting→closed |

---

### ❌ MISSING FEATURES (Need Implementation)

| Feature | Reference File | Description |
|---------|---------------|-------------|
| `/move` | `slash/move.js` | Move ticket to different category |
| `/rename` | `slash/rename.js` | Rename ticket channel (with rate limit) |
| `/topic` | `slash/topic.js` | Change ticket topic via modal |
| `/tag` | `slash/tag.js` | Send predefined response templates |
| `/force-close` | `slash/force-close.js` | Bulk close tickets by time/category |
| `/help` | `slash/help.js` | Help command |
| Edit button | `buttons/edit.js` | Edit topic/answers after creation |
| Unclaim button | `buttons/unclaim.js` | Button variant of `/release` |
| Questions modal | `modals/questions.js` | Custom questions per category |
| Ticket cooldown | `manager.js:263` | Prevent spam ticket creation |
| Member limit | `manager.js:247` | Max tickets per user per category |
| Total limit | `manager.js:245` | Max open tickets per category |
| Required roles | `manager.js:236` | Roles needed to create tickets |
| Blocklist | `manager.js:226` | Blocked roles can't create tickets |
| Working hours | `manager.js:749` | Notify if outside working hours |
| Offline notification | `manager.js:791` | Notify if no staff online |
| DM on close | `manager.js:1361` | Send closure summary to user |
| Auto-close | `manager.js:1179` | Auto-close after timeout |
| Stale tickets | `lib/stale.js` | Track inactive tickets |
| Encryption | Throughout | Encrypt sensitive data (topic, answers) |
| Tags system | Database | Predefined response templates |
| Log channel | `lib/logging.js` | Log events to Discord channel |
| Archived messages | `archiver.js` | Save all messages for transcripts |
| Reference tickets | `manager.js:614` | Link to previous tickets |
| Reference messages | `manager.js:572` | Link to Discord messages |
| Opening message edit | Various | Update embed when topic changes |
| Custom channel name | `manager.js:403` | Template: `{username}-{number}` |
| Ping roles | `manager.js:546` | Ping staff on new ticket |

---

### ⚠️ PARTIAL IMPLEMENTATIONS

| Feature | Current State | Reference Behavior |
|---------|--------------|-------------------|
| Categories | DB schema exists, basic selector | Full CRUD with questions, limits, roles |
| Feedback | Collects rating/comment | Stores in DB, shows in close summary |
| Transcripts | Basic markdown export | Full HTML with attachments |
| Claiming | Hides from staff role | Updates opening message buttons |
| Panel command | Creates embed+button | Includes category descriptions, emojis |

---

### Database Schema Gaps

**Missing Tables:**
- `tags` - Predefined response templates
- `ticketFeedback` - Separate feedback storage
- `archivedMessages` - Full message archive

**Missing Fields in `supportTickets`:**
- `openingMessageId` - To edit the opening message
- `lastMessageAt` - For auto-close/stale detection
- `number` - Sequential ticket number per guild
- `topic` (encrypted) - Stored separately from subject

**Missing Fields in `ticketCategories`:**
- `channelName` - Template for channel names
- `image` - Image for opening embed
- `ratelimit` - Slowmode for ticket channel
- `requiredRoles` - Roles required to create
- `claiming` - Enable/disable claiming

---

### Priority Fixes Needed

1. **`/move` command** - Essential for multi-category support
2. **`/rename` command** - Users expect to rename their tickets
3. **`/topic` command** - Edit topic after creation
4. **Edit button** - Match the reference's edit functionality
5. **DM on close** - User notification is important UX
6. **Opening message updates** - When claiming/editing
7. **Ticket cooldown** - Prevent abuse
8. **Log channel** - Admin visibility

---

## Recommended Improvements

*Space for your notes:*

1. 

2. 

3. 

4. 

5. 

---

*This is a temporary guide document. Delete after review.*
