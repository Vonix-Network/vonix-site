import { db } from '@/db';
import { cryptoInvoices, cryptoTransactions, cryptoWallets, cryptoWalletAuditLog } from '@/db/crypto-schema';
import { donations, users, donationRanks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ExchangeRateService } from './exchange-rates';

/**
 * Transaction Checker Service
 * Monitors blockchain for incoming payments to invoice addresses
 * 
 * Integration points for blockchain APIs:
 * - Bitcoin: Blockchain.info, BlockCypher, or self-hosted node
 * - Ethereum: Etherscan, Infura, Alchemy, or self-hosted node
 */

interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string; // In crypto units
  confirmations: number;
  blockNumber?: number;
  timestamp?: number;
  fee?: string;
}

export class TransactionChecker {
  /**
   * Checks an invoice for new transactions
   */
  static async checkInvoice(invoiceId: string): Promise<{
    found: boolean;
    transactions: number;
    totalReceived: string;
    status: string;
  }> {
    const [invoice] = await db
      .select()
      .from(cryptoInvoices)
      .where(eq(cryptoInvoices.id, invoiceId));

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return {
        found: false,
        transactions: 0,
        totalReceived: invoice.totalReceived || '0',
        status: invoice.status,
      };
    }

    // Get wallet info
    const [wallet] = await db
      .select()
      .from(cryptoWallets)
      .where(eq(cryptoWallets.id, invoice.walletId));

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check blockchain for transactions
    const transactions = await this.getAddressTransactions(
      invoice.paymentAddress,
      invoice.currency,
      wallet.network || 'mainnet'
    );

    let newTransactionsFound = 0;
    let totalReceived = parseFloat(invoice.totalReceived || '0');

    // Process each transaction
    for (const tx of transactions) {
      // Check if transaction already exists
      const [existing] = await db
        .select()
        .from(cryptoTransactions)
        .where(eq(cryptoTransactions.txHash, tx.hash));

      if (!existing) {
        // New transaction detected
        const exchangeRate = await ExchangeRateService.getRate(invoice.currency);
        const usdValue = parseFloat(tx.value) * parseFloat(exchangeRate);

        await db.insert(cryptoTransactions).values({
          invoiceId: invoice.id,
          txHash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to,
          amount: tx.value,
          currency: invoice.currency,
          network: wallet.network,
          usdValue,
          exchangeRate,
          status: tx.confirmations >= wallet.minConfirmations ? 'confirmed' : 'confirming',
          confirmations: tx.confirmations,
          requiredConfirmations: wallet.minConfirmations,
          blockNumber: tx.blockNumber,
          blockTimestamp: tx.timestamp ? new Date(tx.timestamp * 1000) : undefined,
          gasFee: tx.fee,
          detectionMethod: 'manual_check',
          confirmedAt: tx.confirmations >= wallet.minConfirmations ? new Date() : undefined,
        });

        totalReceived += parseFloat(tx.value);
        newTransactionsFound++;

        // Log detection
        await db.insert(cryptoWalletAuditLog).values({
          walletId: wallet.id,
          invoiceId: invoice.id,
          userId: invoice.userId,
          action: 'payment_detected',
          details: JSON.stringify({
            txHash: tx.hash,
            amount: tx.value,
            confirmations: tx.confirmations,
          }),
        });
      } else if (existing.status === 'confirming' && tx.confirmations >= wallet.minConfirmations) {
        // Update confirmation status
        await db
          .update(cryptoTransactions)
          .set({
            status: 'confirmed',
            confirmations: tx.confirmations,
            confirmedAt: new Date(),
          })
          .where(eq(cryptoTransactions.id, existing.id));
      }
    }

    // Update invoice if new transactions found
    if (newTransactionsFound > 0) {
      const totalReceivedUsd = totalReceived * parseFloat(invoice.exchangeRate);
      const expectedAmount = parseFloat(invoice.cryptoAmount);
      
      let newStatus: 'pending' | 'partially_paid' | 'paid' | 'overpaid' = 'pending';
      if (totalReceived >= expectedAmount) {
        newStatus = totalReceived > expectedAmount * 1.01 ? 'overpaid' : 'paid';
      } else if (totalReceived > 0) {
        newStatus = 'partially_paid';
      }

      await db
        .update(cryptoInvoices)
        .set({
          totalReceived: totalReceived.toString(),
          totalReceivedUsd,
          status: newStatus,
          paidAt: newStatus === 'paid' || newStatus === 'overpaid' ? new Date() : undefined,
          lastCheckedAt: new Date(),
          checkCount: (invoice.checkCount || 0) + 1,
        })
        .where(eq(cryptoInvoices.id, invoice.id));

      // If paid, create donation record and assign rank
      if (newStatus === 'paid' || newStatus === 'overpaid') {
        await this.processPaidInvoice(invoice.id);
      }
    } else {
      // Update last checked time
      await db
        .update(cryptoInvoices)
        .set({
          lastCheckedAt: new Date(),
          checkCount: (invoice.checkCount || 0) + 1,
        })
        .where(eq(cryptoInvoices.id, invoice.id));
    }

    return {
      found: newTransactionsFound > 0,
      transactions: newTransactionsFound,
      totalReceived: totalReceived.toString(),
      status: newTransactionsFound > 0 ? 'updated' : 'no_change',
    };
  }

  /**
   * Processes a paid invoice - creates donation and assigns rank
   */
  private static async processPaidInvoice(invoiceId: string) {
    const [invoice] = await db
      .select()
      .from(cryptoInvoices)
      .where(eq(cryptoInvoices.id, invoiceId));

    if (!invoice || !invoice.userId) {
      return;
    }

    // Check if donation already created
    if (invoice.donationId) {
      return;
    }

    // Get rank details
    let rankDays = 30; // Default
    if (invoice.rankId) {
      const [rank] = await db
        .select()
        .from(donationRanks)
        .where(eq(donationRanks.id, invoice.rankId));
      
      if (rank) {
        rankDays = rank.duration || 30;
      }
    }

    // Create donation record
    const [donation] = await db.insert(donations).values({
      userId: invoice.userId,
      amount: invoice.totalReceivedUsd || invoice.usdAmount,
      currency: 'USD',
      method: `Crypto (${invoice.currency})`,
      message: invoice.memo,
      displayed: true,
      paymentId: invoice.id,
      rankId: invoice.rankId,
      days: rankDays,
      paymentType: 'one_time',
      status: 'completed',
    }).returning();

    // Update invoice with donation ID
    await db
      .update(cryptoInvoices)
      .set({ donationId: donation.id })
      .where(eq(cryptoInvoices.id, invoiceId));

    // Assign rank to user
    if (invoice.rankId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rankDays);

      await db
        .update(users)
        .set({
          donationRankId: invoice.rankId,
          rankExpiresAt: expiresAt,
          totalDonated: db.raw(`COALESCE(total_donated, 0) + ${invoice.totalReceivedUsd || invoice.usdAmount}`),
        })
        .where(eq(users.id, invoice.userId));
    }
  }

  /**
   * Gets transactions for an address from blockchain
   * This is a placeholder - implement with actual blockchain API
   */
  private static async getAddressTransactions(
    address: string,
    currency: string,
    network: string
  ): Promise<BlockchainTransaction[]> {
    // TODO: Implement actual blockchain API integration
    // For Bitcoin: Use Blockchain.info, BlockCypher, or Bitcoin node RPC
    // For Ethereum: Use Etherscan API, Infura, or Ethereum node RPC
    
    if (currency === 'BTC') {
      return this.getBitcoinTransactions(address, network);
    } else if (['ETH', 'USDT', 'USDC', 'BNB'].includes(currency)) {
      return this.getEthereumTransactions(address, currency, network);
    }
    
    return [];
  }

  /**
   * Gets Bitcoin transactions using Blockchain.info API
   */
  private static async getBitcoinTransactions(
    address: string,
    network: string
  ): Promise<BlockchainTransaction[]> {
    try {
      // Use Blockchain.info for mainnet
      if (network === 'mainnet') {
        const response = await fetch(`https://blockchain.info/rawaddr/${address}`);
        
        if (!response.ok) {
          console.error('Blockchain API error:', response.statusText);
          return [];
        }

        const data = await response.json();
        
        return data.txs?.map((tx: any) => ({
          hash: tx.hash,
          from: tx.inputs[0]?.prev_out?.addr || 'unknown',
          to: address,
          value: (tx.out.find((o: any) => o.addr === address)?.value || 0) / 100000000, // Convert satoshis to BTC
          confirmations: data.n_tx - tx.tx_index,
          blockNumber: tx.block_height,
          timestamp: tx.time,
        })) || [];
      }
      
      // For testnet, use BlockCypher or other testnet API
      return [];
    } catch (error) {
      console.error('Failed to fetch Bitcoin transactions:', error);
      return [];
    }
  }

  /**
   * Gets Ethereum transactions using Etherscan API
   */
  private static async getEthereumTransactions(
    address: string,
    currency: string,
    network: string
  ): Promise<BlockchainTransaction[]> {
    try {
      const apiKey = process.env.ETHERSCAN_API_KEY || '';
      const baseUrl = network === 'mainnet' 
        ? 'https://api.etherscan.io/api'
        : 'https://api-sepolia.etherscan.io/api';

      // For ERC-20 tokens (USDT, USDC)
      const action = currency === 'ETH' ? 'txlist' : 'tokentx';
      
      const response = await fetch(
        `${baseUrl}?module=account&action=${action}&address=${address}&sort=desc&apikey=${apiKey}`
      );

      if (!response.ok) {
        console.error('Etherscan API error:', response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (data.status !== '1') {
        return [];
      }

      return data.result?.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: currency === 'ETH' 
          ? (parseInt(tx.value) / 1e18).toString()
          : (parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'))).toString(),
        confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
        blockNumber: parseInt(tx.blockNumber),
        timestamp: parseInt(tx.timeStamp),
        fee: (parseInt(tx.gasUsed || '0') * parseInt(tx.gasPrice || '0') / 1e18).toString(),
      })) || [];
    } catch (error) {
      console.error('Failed to fetch Ethereum transactions:', error);
      return [];
    }
  }

  /**
   * Checks all pending invoices (for background job)
   */
  static async checkAllPendingInvoices(): Promise<number> {
    const pendingInvoices = await db
      .select()
      .from(cryptoInvoices)
      .where(
        and(
          eq(cryptoInvoices.status, 'pending'),
          eq(cryptoInvoices.status, 'partially_paid')
        )
      );

    let updatedCount = 0;

    for (const invoice of pendingInvoices) {
      try {
        const result = await this.checkInvoice(invoice.id);
        if (result.found) {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to check invoice ${invoice.id}:`, error);
      }
    }

    return updatedCount;
  }
}
