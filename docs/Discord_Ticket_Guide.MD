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
 
 ## Current Discord Ticket Setup (How it works now)
 
 This project now contains a Discord ticket flow implemented in `src/lib/discord-tickets.ts` and backed by the Drizzle/SQLite schema in `src/db/schema.ts`.
 
 ### Requirements / Configuration
 
 Discord bot settings are stored in `siteSettings` (category `discord`). These keys must be set for the bot to run and register commands:
 
 - `discord_bot_token`
 - `discord_client_id`
 - `discord_guild_id`
 - `discord_ticket_category_id` (Discord Category channel ID used for ticket channels)
 - `discord_ticket_staff_role_id` (role allowed to manage tickets)
 - `discord_ticket_ping_role_id` (optional; pinged when a ticket is created)
 - `discord_ticket_log_channel_id` (optional; ticket logs)
 - `discord_ticket_transcript_channel_id` (optional)
 
 ### One-time Setup (Admin)
 
 **Configure category + staff role**
 
 Run in Discord (Admin only):
 
 - `/setup category:<categoryChannel> staff_role:<role>`
 
 This writes:
 - `discord_ticket_category_id`
 - `discord_ticket_staff_role_id`
 
 **Create the ticket panel**
 
 Run in Discord (Admin only):
 
 - `/panel [channel] [title] [description]`
 
 This posts an embed with:
 - a category selector (if multiple enabled categories exist)
 - a `Create Ticket` button
 
 ### Ticket creation sources
 
 Users can create tickets via:
 - `/new [topic]`
 - Panel `Create Ticket` button (topic modal)
 - Panel category select (topic modal + category)
 
 On create:
 - A new Discord text channel is created under `discord_ticket_category_id`
 - Permissions are set for:
   - the ticket creator
   - staff role (if configured)
 - A DB row is created in `supportTickets` with a sequential `number`
 - The opening embed is posted with buttons (claim/close)
 - Messages in the ticket channel are mirrored into `ticketMessages`
 
 ### Commands (Current)
 
 **User commands**
 - `/new [topic]`
 - `/close [reason]`
 - `/tickets`
 - `/transcript [ticket_id]`
 - `/help`
 
 **Staff commands**
 - `/claim`
 - `/release`
 - `/add <member>`
 - `/remove <member>`
 - `/transfer <member>`
 - `/priority <level>`
 - `/move <category>`
 - `/rename <name>`
 - `/topic` (opens modal to edit topic)
 - `/tag <tag> [for]` (predefined response)
 - `/force-close [ticket] [time] [reason]`
 
 **Autocomplete**
 - `/move category:` autocompletes enabled categories
 - `/tag tag:` autocompletes enabled tags
 - `/force-close ticket:` autocompletes open tickets
 
 ### Buttons and Modals
 
 **Buttons**
 - Claim: marks ticket claimed
 - Close: triggers close flow (with feedback modal if enabled)
 - Create Ticket (panel): opens topic modal
 
 **Modals**
 - Create ticket topic modal
 - Edit topic modal (`/topic`) updates `supportTickets.topic` and the channel topic
 - Feedback modal stores to `ticketFeedback` then closes ticket
 
 ### Ticket numbering
 
 `supportTickets.number` is required. All ticket creation paths (website, guest, Discord) generate a new `number` using `MAX(number) + 1`.
 
 ### Tags and feedback
 
 - Tags live in `ticket_tags` (`ticketTags` in schema). `/tag` sends the stored content and increments `usageCount`.
 - Feedback lives in `ticket_feedback` (`ticketFeedback` in schema). The feedback modal stores `rating` and optional `comment`.
 
 ---
 
 ## Verification Checklist
 
 - **[settings]** Confirm all required `siteSettings` keys exist (token, clientId, guildId, ticket category, staff role).
 - **[commands]** Ensure slash commands appear in the guild (run registration on deploy/start if needed).
 - **[panel]** Run `/panel` and confirm Create button + category select work.
 - **[create]** Create a ticket via `/new` and via the panel; confirm:
   - channel created under correct Discord category
   - permissions for user + staff role
   - DB row created with `supportTickets.number`
 - **[topic]** Run `/topic`, submit modal, confirm channel topic + DB updated.
 - **[tag]** Create a tag in DB and run `/tag` to confirm message sends and `usageCount` increments.
 - **[close+feedback]** Close a ticket, submit feedback, confirm `ticket_feedback` has a row.
 - **[transcript]** Run `/transcript` and confirm download works.
 - **[logging]** If `discord_ticket_log_channel_id` is set, confirm log messages appear.
 
 ## Recommended Improvements
 
 *Space for your notes:*

1. 

2. 

3. 

4. 

5. 

---
