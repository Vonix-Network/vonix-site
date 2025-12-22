# Cryptocurrency Payment System Setup Guide

## Overview

This comprehensive cryptocurrency payment system integrates with your existing donation system to support Bitcoin, Ethereum, and ERC-20 tokens (USDT, USDC, BNB) with the following features:

- **Invoice-Based Payments**: Each payment gets a unique blockchain address
- **Non-Expiring Invoices**: Invoices remain valid indefinitely (configurable)
- **Manual Transaction Checking**: Users can request invoice status updates on-demand
- **Encrypted Wallet Management**: HD wallets with AES-256-GCM encryption
- **Automatic Rank Assignment**: Ranks assigned automatically upon payment confirmation
- **Donation History Integration**: All crypto payments appear in `/donate` history

## Prerequisites

1. Node.js 18+ installed
2. Database access (SQLite/PostgreSQL/MySQL)
3. API keys for blockchain services (optional but recommended)

## Installation

### 1. Install Dependencies

```bash
npm install --save \
  ethers \
  bitcoinjs-lib \
  tiny-secp256k1 \
  bip32 \
  bip39 \
  qrcode \
  uuid
```

### 2. Environment Variables

Add to your `.env` file:

```bash
# Crypto Wallet Master Secret (CRITICAL - Keep this secure!)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CRYPTO_MASTER_SECRET="your-256-bit-secret-key-here"

# Blockchain API Keys (Optional but recommended for production)
ETHERSCAN_API_KEY="your-etherscan-api-key"
INFURA_PROJECT_ID="your-infura-project-id"
ALCHEMY_API_KEY="your-alchemy-api-key"

# For Bitcoin (optional)
BLOCKCYPHER_TOKEN="your-blockcypher-token"
```

### 3. Run Database Migrations

```bash
npm run db:generate
npm run db:push
```

## Configuration

### 1. Create Master Wallets

Access the admin dashboard at `/admin/crypto-wallets` and create master HD wallets for each cryptocurrency you want to support:

1. Click "Create New Wallet"
2. Select currency (BTC, ETH, USDT, USDC, or BNB)
3. Choose network (mainnet for production, testnet for testing)
4. Create a strong password (minimum 16 characters recommended)
5. **IMPORTANT**: Save the mnemonic phrase securely offline

### 2. Enable Crypto Payments

In the admin dashboard (`/admin/crypto-settings`):

1. Toggle "Enable Crypto Payments"
2. Configure supported currencies
3. Set minimum donation amounts per currency
4. Configure confirmation requirements (default: 3 confirmations)
5. Set invoice expiration (0 = never expires)

### 3. Configure Donation Ranks

Ensure your donation ranks are configured in `/admin/ranks` with appropriate USD amounts that will be used for crypto payment conversion.

## Usage

### For Users

#### Making a Crypto Donation

1. Navigate to the donate page
2. Select a donation rank or enter custom amount
3. Choose cryptocurrency payment method
4. Select desired currency (BTC, ETH, etc.)
5. Receive unique payment address and QR code
6. Send exact crypto amount to the provided address
7. Click "Check for Payment" to manually verify transaction
8. Rank automatically assigned upon confirmation

#### Viewing Invoice Status

- Access invoice via link or dashboard
- View payment address, amount, and QR code
- See transaction status and confirmations
- Request manual check anytime
- Download invoice for records

### For Administrators

#### Managing Wallets

Access `/admin/crypto-wallets` to:
- View all master wallets
- Check total balance per currency
- Monitor derivation index (addresses generated)
- Update wallet passwords
- Disable/enable wallets
- View audit logs

#### Managing Invoices

Access `/admin/crypto-invoices` to:
- View all invoices (pending, paid, cancelled)
- Search by invoice number, user, or address
- Manually check invoice status
- Cancel invoices
- Export invoice data

#### Monitoring Transactions

Access `/admin/crypto-transactions` to:
- View all detected blockchain transactions
- Monitor confirmation status
- Track USD values at time of payment
- View blockchain explorer links
- Audit transaction detection

## Security Best Practices

### Critical Security Measures

1. **Master Secret Protection**
   - Never commit `CRYPTO_MASTER_SECRET` to version control
   - Use environment variable management (e.g., Vercel secrets, AWS Secrets Manager)
   - Rotate secret periodically in high-security environments

2. **Wallet Passwords**
   - Require strong passwords (16+ characters)
   - Store passwords in secure password manager
   - Never share passwords or mnemonics

3. **Mnemonic Phrase Backup**
   - Write down mnemonic phrase on paper
   - Store in secure physical location (safe, safety deposit box)
   - Never store digitally or in plain text
   - Consider multi-location backups

4. **Access Control**
   - Restrict wallet management to superadmin only
   - Enable 2FA for admin accounts
   - Monitor audit logs regularly
   - Limit API access

5. **Network Security**
   - Use HTTPS only
   - Implement rate limiting on API endpoints
   - Monitor for suspicious activity
   - Keep dependencies updated

### Wallet Recovery

If you need to recover a wallet:

1. Ensure you have the mnemonic phrase
2. Use the same derivation path
3. Import into the system or compatible wallet
4. Verify addresses match

## Blockchain API Integration

### Bitcoin

The system supports multiple Bitcoin APIs:

**Free Options:**
- Blockchain.info API (default, no API key needed)
- BlockCypher API (generous free tier)

**Self-Hosted:**
- Bitcoin Core RPC (most reliable for high volume)

### Ethereum & ERC-20 Tokens

**Recommended APIs:**
- Etherscan API (free tier: 5 calls/second)
- Infura (free tier available)
- Alchemy (free tier available)

**Configuration:**
```typescript
// src/lib/crypto/transaction-checker.ts
// Add your preferred API key in .env
```

## Background Jobs (Recommended)

For automatic transaction checking, set up a cron job or background worker:

```typescript
// Example using node-cron
import cron from 'node-cron';
import { TransactionChecker } from '@/lib/crypto/transaction-checker';

// Check pending invoices every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Checking pending crypto invoices...');
  const updated = await TransactionChecker.checkAllPendingInvoices();
  console.log(`Updated ${updated} invoices`);
});
```

## Monitoring & Maintenance

### Regular Tasks

1. **Daily:**
   - Check pending invoices
   - Monitor transaction confirmations
   - Review audit logs

2. **Weekly:**
   - Verify wallet balances
   - Check exchange rate cache
   - Review failed transactions

3. **Monthly:**
   - Audit security logs
   - Update dependencies
   - Backup wallet data
   - Review and update minimum amounts

### Troubleshooting

#### Invoice Not Detecting Payment

1. Verify correct address and amount sent
2. Check blockchain explorer for transaction
3. Ensure sufficient confirmations
4. Verify API keys are valid
5. Check network connectivity
6. Review error logs

#### Wallet Access Issues

1. Verify password is correct
2. Check CRYPTO_MASTER_SECRET is set
3. Review audit logs for clues
4. Ensure database integrity

## API Endpoints

### Public Endpoints

- `POST /api/crypto/create-invoice` - Create new invoice
- `GET /api/crypto/invoice/[id]` - Get invoice details
- `POST /api/crypto/check-invoice/[id]` - Manually check for payments
- `GET /api/crypto/rates` - Get current exchange rates

### Admin Endpoints (Requires Authentication)

- `POST /api/admin/crypto/create-wallet` - Create new master wallet
- `GET /api/admin/crypto/wallets` - List all wallets
- `GET /api/admin/crypto/invoices` - List all invoices
- `GET /api/admin/crypto/transactions` - List all transactions
- `POST /api/admin/crypto/settings` - Update crypto settings

## Testing

### Testnet Testing

1. Create testnet wallets (Bitcoin testnet, Sepolia for Ethereum)
2. Get testnet funds from faucets:
   - Bitcoin: https://testnet-faucet.com/btc-testnet/
   - Ethereum Sepolia: https://sepoliafaucet.com/
3. Create test invoice
4. Send testnet crypto
5. Verify detection and confirmation

### Integration Testing

```bash
# Test wallet creation
npm test -- wallet-manager.test.ts

# Test encryption
npm test -- encryption.test.ts

# Test transaction checking
npm test -- transaction-checker.test.ts
```

## Support

For issues or questions:

1. Check this documentation
2. Review error logs
3. Check audit logs for security events
4. Consult blockchain API documentation
5. Contact development team

## Compliance & Legal

**Important:** Cryptocurrency payments may be subject to:

- Tax reporting requirements
- KYC/AML regulations depending on jurisdiction
- Securities regulations
- Local cryptocurrency laws

Consult with legal and tax professionals before accepting cryptocurrency payments for your specific use case and jurisdiction.
