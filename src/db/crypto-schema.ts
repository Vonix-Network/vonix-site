import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { users, donations } from './schema';

// ===================================
// CRYPTO PAYMENT SETTINGS
// ===================================

export const cryptoPaymentSettings = sqliteTable('crypto_payment_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
  // Supported cryptocurrencies (JSON array: ['BTC', 'ETH', 'USDT', etc.])
  supportedCurrencies: text('supported_currencies').default('[]').notNull(),
  // Minimum donation amounts per currency (JSON object: {"BTC": 0.0001, "ETH": 0.001})
  minimumAmounts: text('minimum_amounts').default('{}').notNull(),
  // Default confirmation requirements
  defaultConfirmations: integer('default_confirmations').default(3).notNull(),
  // Auto-refresh interval for checking payments (seconds)
  autoRefreshInterval: integer('auto_refresh_interval').default(300).notNull(),
  // Invoice expiration (0 = never expires)
  invoiceExpirationHours: integer('invoice_expiration_hours').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// CRYPTO WALLETS (Master Wallets)
// ===================================

export const cryptoWallets = sqliteTable('crypto_wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currency: text('currency').notNull(), // BTC, ETH, USDT, etc.
  network: text('network'), // mainnet, testnet, polygon, bsc, etc.
  // Encrypted wallet data (contains private key, mnemonic, etc.)
  encryptedWalletData: text('encrypted_wallet_data').notNull(),
  // Encrypted master password hash (for additional security layer)
  encryptedPasswordHash: text('encrypted_password_hash').notNull(),
  // Master public address (for HD wallet derivation)
  masterPublicKey: text('master_public_key').notNull(),
  // QR code data URL for master address
  qrCodeDataUrl: text('qr_code_data_url'),
  // Wallet label/name
  label: text('label'),
  // Derivation path (for HD wallets)
  derivationPath: text('derivation_path'),
  // Next derivation index for generating unique addresses
  nextDerivationIndex: integer('next_derivation_index').default(0).notNull(),
  // Security features
  requiresConfirmation: integer('requires_confirmation', { mode: 'boolean' }).default(true).notNull(),
  minConfirmations: integer('min_confirmations').default(3).notNull(),
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// CRYPTO INVOICES (Non-expiring payment requests)
// ===================================

export const cryptoInvoices = sqliteTable('crypto_invoices', {
  id: text('id').primaryKey(), // UUID
  invoiceNumber: text('invoice_number').notNull().unique(), // Human-readable invoice number
  // User association
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: text('username'), // Store username for reference
  email: text('email'), // Store email for notifications
  // Payment details
  rankId: text('rank_id'),
  rankName: text('rank_name'),
  usdAmount: real('usd_amount').notNull(),
  currency: text('currency').notNull(), // BTC, ETH, etc.
  cryptoAmount: text('crypto_amount').notNull(), // Amount in crypto (string for precision)
  exchangeRate: text('exchange_rate').notNull(), // Rate at invoice creation
  // Wallet and address
  walletId: integer('wallet_id').notNull().references(() => cryptoWallets.id, { onDelete: 'cascade' }),
  paymentAddress: text('payment_address').notNull().unique(), // Unique address for this invoice
  derivationIndex: integer('derivation_index'), // HD wallet index used
  qrCodeDataUrl: text('qr_code_data_url'), // QR code for payment address
  // Status
  status: text('status', {
    enum: ['pending', 'partially_paid', 'paid', 'overpaid', 'cancelled']
  }).default('pending').notNull(),
  // Payment tracking
  totalReceived: text('total_received').default('0'), // Total crypto received
  totalReceivedUsd: real('total_received_usd').default(0), // Total USD value received
  // Linked entities
  donationId: integer('donation_id').references(() => donations.id, { onDelete: 'set null' }),
  // Transaction checking
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
  checkCount: integer('check_count').default(0), // Track manual check requests
  // Metadata
  memo: text('memo'), // Optional note/reference
  metadata: text('metadata'), // JSON for additional data
  // Timestamps (invoices don't expire by default)
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // Optional expiration
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// CRYPTO TRANSACTIONS (Detected payments)
// ===================================

export const cryptoTransactions = sqliteTable('crypto_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Invoice association
  invoiceId: text('invoice_id').notNull().references(() => cryptoInvoices.id, { onDelete: 'cascade' }),
  // Transaction details
  txHash: text('tx_hash').notNull().unique(),
  fromAddress: text('from_address'),
  toAddress: text('to_address').notNull(),
  amount: text('amount').notNull(), // Crypto amount (string for precision)
  currency: text('currency').notNull(),
  network: text('network'),
  // USD conversion at time of transaction
  usdValue: real('usd_value'),
  exchangeRate: text('exchange_rate'), // Rate at time of detection
  // Status tracking
  status: text('status', {
    enum: ['detected', 'confirming', 'confirmed', 'failed']
  }).default('detected').notNull(),
  confirmations: integer('confirmations').default(0).notNull(),
  requiredConfirmations: integer('required_confirmations').default(3).notNull(),
  // Blockchain data
  blockNumber: integer('block_number'),
  blockTimestamp: integer('block_timestamp', { mode: 'timestamp' }),
  gasUsed: text('gas_used'),
  gasFee: text('gas_fee'),
  // Detection metadata
  detectionMethod: text('detection_method'), // webhook, manual_check, auto_check
  // Timestamps
  detectedAt: integer('detected_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// CRYPTO EXCHANGE RATES CACHE
// ===================================

export const cryptoExchangeRates = sqliteTable('crypto_exchange_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currency: text('currency').notNull().unique(), // BTC, ETH, etc.
  usdRate: text('usd_rate').notNull(), // Current USD exchange rate (string for precision)
  provider: text('provider').default('coingecko'), // Rate provider
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// CRYPTO WALLET AUDIT LOG
// ===================================

export const cryptoWalletAuditLog = sqliteTable('crypto_wallet_audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletId: integer('wallet_id').references(() => cryptoWallets.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => cryptoInvoices.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // created, accessed, checked, payment_detected, etc.
  details: text('details'), // JSON with additional context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  success: integer('success', { mode: 'boolean' }).default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// TYPE EXPORTS
// ===================================

export type CryptoPaymentSettings = typeof cryptoPaymentSettings.$inferSelect;
export type CryptoWallet = typeof cryptoWallets.$inferSelect;
export type CryptoInvoice = typeof cryptoInvoices.$inferSelect;
export type CryptoTransaction = typeof cryptoTransactions.$inferSelect;
export type CryptoExchangeRate = typeof cryptoExchangeRates.$inferSelect;
export type CryptoWalletAuditLog = typeof cryptoWalletAuditLog.$inferSelect;
