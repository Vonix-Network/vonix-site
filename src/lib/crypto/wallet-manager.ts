import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import QRCode from 'qrcode';
import { encryptWalletData, decryptWalletData, hashPassword, verifyPassword as verifyHashedPassword } from './encryption';
import { db } from '@/db';
import { cryptoWallets, cryptoWalletAuditLog, cryptoInvoices } from '@/db/crypto-schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const bip32 = BIP32Factory(ecc);

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  masterPublicKey: string;
  derivationPath: string;
}

export interface CreateWalletOptions {
  currency: 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'BNB';
  network?: 'mainnet' | 'testnet';
  label?: string;
  password: string;
  userId?: number;
}

/**
 * Cryptocurrency Wallet Manager
 * Handles HD wallet creation, encryption, and address derivation
 */
export class CryptoWalletManager {
  /**
   * Creates a new HD cryptocurrency wallet
   */
  static async createWallet(options: CreateWalletOptions) {
    const { currency, network = 'mainnet', label, password, userId } = options;

    // Generate mnemonic
    const mnemonic = bip39.generateMnemonic(256); // 24-word mnemonic for extra security
    const seed = await bip39.mnemonicToSeed(mnemonic);

    let walletData: WalletData;

    switch (currency) {
      case 'BTC':
        walletData = this.createBitcoinHDWallet(seed, network);
        break;
      
      case 'ETH':
      case 'USDT':
      case 'USDC':
      case 'BNB':
        walletData = this.createEthereumHDWallet(seed);
        break;
      
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }

    // Include mnemonic in wallet data
    walletData.mnemonic = mnemonic;

    // Encrypt wallet data
    const encryptedWalletData = encryptWalletData(JSON.stringify(walletData));
    const encryptedPasswordHash = encryptWalletData(hashPassword(password));

    // Generate QR code for master public key (for reference)
    const qrCodeDataUrl = await QRCode.toDataURL(walletData.masterPublicKey, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    // Save to database
    const [wallet] = await db.insert(cryptoWallets).values({
      currency,
      network,
      encryptedWalletData,
      encryptedPasswordHash,
      masterPublicKey: walletData.masterPublicKey,
      qrCodeDataUrl,
      label: label || `${currency} Wallet`,
      derivationPath: walletData.derivationPath,
      nextDerivationIndex: 0,
      isActive: true,
    }).returning();

    // Audit log
    await this.logAudit({
      walletId: wallet.id,
      userId,
      action: 'wallet_created',
      details: JSON.stringify({ currency, network, label }),
    });

    return wallet;
  }

  /**
   * Creates a Bitcoin HD wallet from seed
   */
  private static createBitcoinHDWallet(seed: Buffer, network: 'mainnet' | 'testnet'): WalletData {
    const btcNetwork = network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const basePath = "m/44'/0'/0'"; // BIP44 path for Bitcoin (account level)
    
    const root = bip32.fromSeed(seed, btcNetwork);
    const account = root.derivePath(basePath);
    
    if (!account.privateKey) {
      throw new Error('Failed to generate Bitcoin private key');
    }

    return {
      mnemonic: '',
      privateKey: account.privateKey.toString('hex'),
      publicKey: account.publicKey.toString('hex'),
      masterPublicKey: account.neutered().toBase58(), // xpub for address derivation
      derivationPath: basePath,
    };
  }

  /**
   * Creates an Ethereum HD wallet from seed
   */
  private static createEthereumHDWallet(seed: Buffer): WalletData {
    const basePath = "m/44'/60'/0'"; // BIP44 path for Ethereum (account level)
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    const account = hdNode.derivePath(basePath);

    return {
      mnemonic: '',
      privateKey: account.privateKey,
      publicKey: account.publicKey,
      masterPublicKey: account.neuter().extendedKey, // xpub equivalent
      derivationPath: basePath,
    };
  }

  /**
   * Derives a unique address from HD wallet for an invoice
   */
  static async deriveUniqueAddress(walletId: number, password: string): Promise<{ address: string; index: number }> {
    const [wallet] = await db.select().from(cryptoWallets).where(eq(cryptoWallets.id, walletId));
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify password
    await this.verifyPassword(wallet, password);

    // Get wallet data
    const walletData = await this.getWalletData(walletId, password);
    
    // Get next derivation index
    const index = wallet.nextDerivationIndex || 0;
    
    // Derive address
    let address: string;
    
    if (wallet.currency === 'BTC') {
      address = this.deriveBitcoinAddress(walletData, index, wallet.network || 'mainnet');
    } else {
      // Ethereum-based
      address = this.deriveEthereumAddress(walletData, index);
    }

    // Increment derivation index
    await db.update(cryptoWallets)
      .set({ nextDerivationIndex: index + 1 })
      .where(eq(cryptoWallets.id, walletId));

    return { address, index };
  }

  /**
   * Derives a Bitcoin address at a specific index
   */
  private static deriveBitcoinAddress(walletData: WalletData, index: number, network: string): string {
    const btcNetwork = network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const seed = bip39.mnemonicToSeedSync(walletData.mnemonic);
    const root = bip32.fromSeed(seed, btcNetwork);
    const path = `${walletData.derivationPath}/0/${index}`; // External chain
    const child = root.derivePath(path);

    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: btcNetwork,
    });

    if (!address) {
      throw new Error('Failed to derive Bitcoin address');
    }

    return address;
  }

  /**
   * Derives an Ethereum address at a specific index
   */
  private static deriveEthereumAddress(walletData: WalletData, index: number): string {
    const seed = bip39.mnemonicToSeedSync(walletData.mnemonic);
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    const path = `${walletData.derivationPath}/0/${index}`; // External chain
    const wallet = hdNode.derivePath(path);

    return wallet.address;
  }

  /**
   * Creates a crypto invoice with unique address
   */
  static async createInvoice(options: {
    walletId: number;
    password: string;
    userId?: number;
    username?: string;
    email?: string;
    rankId?: string;
    rankName?: string;
    usdAmount: number;
    currency: string;
    exchangeRate: string;
    memo?: string;
  }) {
    const { walletId, password, userId, username, email, rankId, rankName, usdAmount, currency, exchangeRate, memo } = options;

    // Derive unique address
    const { address, index } = await this.deriveUniqueAddress(walletId, password);

    // Calculate crypto amount
    const cryptoAmount = (usdAmount / parseFloat(exchangeRate)).toFixed(8);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(address, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    // Create invoice
    const [invoice] = await db.insert(cryptoInvoices).values({
      id: uuidv4(),
      invoiceNumber,
      userId,
      username,
      email,
      rankId,
      rankName,
      usdAmount,
      currency,
      cryptoAmount,
      exchangeRate,
      walletId,
      paymentAddress: address,
      derivationIndex: index,
      qrCodeDataUrl,
      status: 'pending',
      memo,
    }).returning();

    await this.logAudit({
      walletId,
      invoiceId: invoice.id,
      userId,
      action: 'invoice_created',
      details: JSON.stringify({ invoiceNumber, address, usdAmount, currency }),
    });

    return invoice;
  }

  /**
   * Retrieves and decrypts wallet data
   */
  static async getWalletData(walletId: number, password: string, userId?: number): Promise<WalletData> {
    const [wallet] = await db.select().from(cryptoWallets).where(eq(cryptoWallets.id, walletId));
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify password
    await this.verifyPassword(wallet, password, userId);

    // Decrypt wallet data
    const decryptedData = decryptWalletData(wallet.encryptedWalletData);
    const walletData = JSON.parse(decryptedData) as WalletData;

    // Audit log
    await this.logAudit({
      walletId,
      userId,
      action: 'wallet_accessed',
      details: 'Wallet data retrieved',
    });

    return walletData;
  }

  /**
   * Verifies wallet password
   */
  private static async verifyPassword(wallet: any, password: string, userId?: number) {
    try {
      const decryptedPasswordHash = decryptWalletData(wallet.encryptedPasswordHash);
      const isValid = verifyHashedPassword(password, decryptedPasswordHash);
      
      if (!isValid) {
        await this.logAudit({
          walletId: wallet.id,
          userId,
          action: 'wallet_access_denied',
          details: 'Invalid password',
          success: false,
        });
        throw new Error('Invalid password');
      }
    } catch (error) {
      throw new Error('Invalid password');
    }
  }

  /**
   * Updates wallet password
   */
  static async updatePassword(walletId: number, oldPassword: string, newPassword: string, userId?: number) {
    // Verify old password and get wallet data
    const walletData = await this.getWalletData(walletId, oldPassword, userId);

    // Re-encrypt with new password
    const encryptedWalletData = encryptWalletData(JSON.stringify(walletData));
    const encryptedPasswordHash = encryptWalletData(hashPassword(newPassword));

    await db.update(cryptoWallets)
      .set({
        encryptedWalletData,
        encryptedPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(cryptoWallets.id, walletId));

    await this.logAudit({
      walletId,
      userId,
      action: 'password_updated',
      details: 'Wallet password changed',
    });
  }

  /**
   * Logs audit trail for wallet operations
   */
  private static async logAudit(data: {
    walletId?: number;
    invoiceId?: string;
    userId?: number;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  }) {
    await db.insert(cryptoWalletAuditLog).values({
      ...data,
      success: data.success ?? true,
    });
  }

  /**
   * Deletes a wallet (with additional security checks)
   */
  static async deleteWallet(walletId: number, password: string, userId?: number) {
    // Verify password before deletion
    await this.getWalletData(walletId, password, userId);

    await db.delete(cryptoWallets).where(eq(cryptoWallets.id, walletId));

    await this.logAudit({
      walletId,
      userId,
      action: 'wallet_deleted',
      details: 'Wallet permanently deleted',
    });
  }
}
