# Rank System Documentation

## Overview

The Vonix Network rank system is designed similar to Hypixel's implementation, featuring:
- **Visual rank badges** with custom colors, icons, and glow effects
- **Site-wide display** across profiles, forums, posts, and leaderboards
- **Both one-time and subscription payments** via Stripe
- **Automatic rank expiration** and renewal handling
- **Configurable ranks** via admin panel

## Rank Badge Display

### Components

#### `RankBadge`
Displays a donation rank badge with custom styling.

```tsx
import { RankBadge } from '@/components/rank-badge';

<RankBadge
  rank={{
    id: 'supporter',
    name: 'Supporter',
    color: '#00D9FF',
    textColor: '#00D9FF',
    icon: '💎',
    badge: 'VIP',
    glow: true,
  }}
  size="md"
  showIcon={true}
/>
```

#### `RoleBadge`
Displays staff role badges (admin, moderator, etc.).

```tsx
import { RoleBadge } from '@/components/rank-badge';

<RoleBadge role="admin" size="md" />
```

#### `UserInfoWithRank`
Complete user display with avatar and all badges.

```tsx
import { UserInfoWithRank } from '@/components/user-info-with-rank';

<UserInfoWithRank
  username="Player123"
  minecraftUsername="Player123"
  role="moderator"
  donationRank={userRank}
  showAvatar={true}
  avatarSize="md"
  badgeSize="sm"
/>
```

### Where Ranks Appear

- ✅ **Profile pages** - Full rank card with expiration
- ✅ **Forum posts** - Badge next to username
- ✅ **User lists** - Compact badge display
- ✅ **Social posts** - User badges
- ✅ **Leaderboards** - Rank indicators
- ✅ **Messages** - User identification

## Rank Configuration

### Admin Panel

Navigate to **Admin → Donations** to manage ranks:

#### Creating a Rank

```typescript
{
  id: 'supporter',           // Unique identifier (lowercase)
  name: 'Supporter',         // Display name
  minAmount: 5.00,           // Base price
  duration: 30,              // Days per purchase
  color: '#00D9FF',          // Background/border color
  textColor: '#00D9FF',      // Text color
  icon: '💎',                // Emoji icon
  badge: 'VIP',              // Short badge text
  glow: true,                // Enable glow effect
  subtitle: 'Thank you!',    // Subtitle text
  perks: ['Perk 1', 'Perk 2'] // List of benefits
}
```

#### Rank Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (e.g., 'supporter') |
| `name` | string | Display name (e.g., 'Supporter') |
| `minAmount` | number | Base price for duration period |
| `duration` | number | Days included in base price |
| `color` | string | Hex color for background/border |
| `textColor` | string | Hex color for text |
| `icon` | string | Emoji or unicode character |
| `badge` | string | Short text shown in badge |
| `glow` | boolean | Enable glow/pulse animation |
| `subtitle` | string | Subtitle shown in rank card |
| `perks` | JSON | Array of perk strings |

### Pricing

Ranks use **price per day** calculation:

```typescript
// Example: Supporter rank
minAmount: 5.00  // $5 for...
duration: 30     // ...30 days
// = $0.17 per day

// Buying 90 days:
90 days × $0.17 = $15.30 (with 5% discount)
```

Duration packages with automatic discounts:
- **1 Month** (30 days) - Base price
- **3 Months** (90 days) - 5% off
- **6 Months** (180 days) - 10% off
- **12 Months** (365 days) - 15% off

## Payment Types

### One-Time Payment

- Single charge for selected duration
- No automatic renewal
- Rank expires after duration
- User must manually renew

**User Flow:**
1. Select rank
2. Choose "One-Time" payment type
3. Select duration (1/3/6/12 months)
4. Complete Stripe checkout
5. Rank activated immediately

### Subscription Payment (Planned)

Currently, the system supports one-time payments. For true recurring subscriptions:

1. Create Stripe Products for each rank
2. Create Stripe Prices for different intervals
3. Use `mode: 'subscription'` in checkout
4. Handle subscription lifecycle events

**Webhook Events:**
- `invoice.payment_succeeded` - Extend rank duration
- `invoice.payment_failed` - Notify user
- `customer.subscription.deleted` - Handle cancellation
- `customer.subscription.updated` - Track status changes

## Webhook Configuration

### Stripe Webhooks

URL: `https://yourdomain.com/api/stripe/webhook`

**Required Events:**
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `payment_intent.succeeded`

### Webhook Handlers

#### Payment Success
```typescript
// Stripe webhook route handles:
1. Verify webhook signature
2. Extract user ID and rank info from metadata
3. Calculate expiration date
4. Update user rank in database
5. Create donation record
6. Update total donated amount
```

#### Subscription Renewal
```typescript
// On invoice.payment_succeeded:
1. Check if subscription renewal
2. Extend current rank expiration
3. Create donation record for renewal
4. Send confirmation email (optional)
```

#### Rank Expiration
```typescript
// Cron job runs hourly:
1. Find users with expired ranks
2. Remove rank from user
3. Log expiration for analytics
```

## Database Schema

### Users Table
```sql
users {
  id: integer
  username: text
  role: text                      -- admin, moderator, user
  donationRankId: text           -- FK to donation_ranks.id
  rankExpiresAt: timestamp       -- When rank expires
  totalDonated: real             -- Total amount donated
  ...
}
```

### Donation Ranks Table
```sql
donation_ranks {
  id: text PRIMARY KEY           -- e.g., 'supporter'
  name: text                     -- Display name
  minAmount: real                -- Base price
  duration: integer              -- Days
  color: text                    -- Hex color
  textColor: text                -- Hex color
  icon: text                     -- Emoji
  badge: text                    -- Short text
  glow: boolean                  -- Enable glow
  subtitle: text                 -- Subtitle
  perks: text                    -- JSON array
  ...
}
```

### Donations Table
```sql
donations {
  id: integer PRIMARY KEY
  userId: integer
  amount: real
  rankId: text
  days: integer
  paymentType: text              -- one_time, subscription, subscription_renewal
  paymentId: text                -- Stripe payment ID
  subscriptionId: text           -- Stripe subscription ID
  status: text                   -- completed, pending, failed
  receiptNumber: text
  ...
}
```

## Utilities & Helpers

### Rank Fetching

```typescript
import { getUserRank, getRankStatus } from '@/lib/ranks';

// Get user's current rank
const rank = await getUserRank(userId);

// Get detailed status
const status = await getUserRankStatus(userId);
// Returns: { hasRank, rank, expiresAt, isActive, daysRemaining }
```

### Rank Assignment

```typescript
import { assignRankSubscription } from '@/lib/rank-subscription';

// Assign rank to user
await assignRankSubscription(
  userId,
  rankId,
  days
);

// Auto-extends if user already has this rank
```

### Rank Expiration

```typescript
import { formatRankExpiration } from '@/lib/ranks';

// Format time remaining
const text = formatRankExpiration(expiresAt);
// Returns: "7 days remaining", "2 weeks remaining", etc.
```

## Styling

### Hypixel-Style Badges

Ranks use custom colors and glow effects similar to Hypixel:

```css
/* Example: Neon Cyan Supporter */
background: rgba(0, 217, 255, 0.1);
border: 1px solid rgba(0, 217, 255, 0.3);
color: #00D9FF;
box-shadow: 0 0 15px rgba(0, 217, 255, 0.25);
```

### Glow Animation

Ranks with `glow: true` have pulsing animation:

```css
@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Color Examples

```typescript
const rankColors = {
  supporter: {
    color: '#00D9FF',      // Neon Cyan
    textColor: '#00D9FF',
  },
  patron: {
    color: '#8B5CF6',      // Purple
    textColor: '#8B5CF6',
  },
  elite: {
    color: '#EC4899',      // Pink
    textColor: '#EC4899',
  },
  legend: {
    color: '#F97316',      // Orange
    textColor: '#F97316',
  },
};
```

## Cron Jobs

### Expire Ranks (Hourly)

```bash
# Vercel Cron: 0 * * * *
# Endpoint: /api/cron/expire-ranks
```

Removes expired ranks and logs the action.

### Example Cron Response

```json
{
  "success": true,
  "removed": 5,
  "users": ["Player1", "Player2", ...],
  "timestamp": "2024-12-03T20:00:00.000Z"
}
```

## Testing

### Test Stripe Checkout

1. Use Stripe test mode keys
2. Test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any CVC

### Test Webhooks Locally

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

## Production Checklist

- [ ] Set Stripe live keys in admin settings
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Test webhook signature verification
- [ ] Set up cron job for rank expiration
- [ ] Create initial ranks in admin panel
- [ ] Test one-time payment flow
- [ ] Test rank expiration (set short duration)
- [ ] Verify rank display across all pages
- [ ] Test rank upgrade/downgrade (if applicable)
- [ ] Monitor Stripe webhook logs

## API Reference

### GET /api/donation-ranks
Get all available donation ranks.

**Response:**
```json
[
  {
    "id": "supporter",
    "name": "Supporter",
    "minAmount": 5.00,
    "color": "#00D9FF",
    ...
  }
]
```

### POST /api/stripe/create-checkout
Create a Stripe checkout session.

**Request:**
```json
{
  "rankId": "supporter",
  "days": 30,
  "paymentType": "one_time"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/webhook
Handle Stripe webhook events (internal use only).

## Support

### Common Issues

**Rank not appearing after payment:**
- Check webhook was received
- Verify user ID in payment metadata
- Check database for rank assignment
- Look for errors in webhook logs

**Rank not expiring:**
- Verify cron job is running
- Check `rankExpiresAt` timestamp
- Ensure cron secret is set

**Badge not showing:**
- Verify rank is not expired
- Check rank color is valid hex
- Clear browser cache

---

**For more information, see:**
- [SETUP.md](./SETUP.md) - Initial setup guide
- [README.md](./README.md) - Project overview
- Admin Panel → Donations - Rank management
