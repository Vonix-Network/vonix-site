import crypto from 'crypto';

/**
 * Crypto Wallet Encryption Utilities
 * 
 * Uses AES-256-GCM for encryption with the following security features:
 * - 256-bit encryption key derived from environment secret
 * - Random initialization vector (IV) for each encryption
 * - Authentication tag to prevent tampering
 * - PBKDF2 for additional password hashing
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a cryptographic key from the master secret
 */
function getDerivedKey(salt: Buffer): Buffer {
  const masterSecret = process.env.CRYPTO_MASTER_SECRET;
  if (!masterSecret) {
    throw new Error('CRYPTO_MASTER_SECRET environment variable is not set');
  }
  return crypto.pbkdf2Sync(masterSecret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts sensitive wallet data
 * @param plaintext - The data to encrypt
 * @returns Base64-encoded encrypted data with IV, salt, and auth tag
 */
export function encryptWalletData(plaintext: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key
    const key = getDerivedKey(salt);
    
    // Create cipher and encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt + IV + encrypted data + tag
    const combined = Buffer.concat([
      salt,
      iv,
      Buffer.from(encrypted, 'hex'),
      tag
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt wallet data');
  }
}

/**
 * Decrypts wallet data
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext
 */
export function decryptWalletData(encryptedData: string): string {
  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH, combined.length - TAG_LENGTH);
    
    // Derive decryption key
    const key = getDerivedKey(salt);
    
    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt wallet data');
  }
}

/**
 * Hashes a password using PBKDF2
 * @param password - Password to hash
 * @returns Base64-encoded hash with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  
  const combined = Buffer.concat([salt, hash]);
  return combined.toString('base64');
}

/**
 * Verifies a password against a hash
 * @param password - Password to verify
 * @param hashedPassword - Previously hashed password
 * @returns True if password matches
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const combined = Buffer.from(hashedPassword, 'base64');
    const salt = combined.subarray(0, SALT_LENGTH);
    const storedHash = combined.subarray(SALT_LENGTH);
    
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
    
    return crypto.timingSafeEqual(hash, storedHash);
  } catch (error) {
    return false;
  }
}

/**
 * Generates a cryptographically secure random string
 * @param length - Length of the string to generate
 * @returns Random hex string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
