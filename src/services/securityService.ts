/**
 * OmniDesk Security Service
 * Implements client-side cryptography, PBKDF2 + AES-256-GCM, password verification,
 * storage privacy audit and secure data sanitization using the standard Web Crypto API.
 */

// Helper to convert Uint8Array to hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives a PBKDF2 key from a password and salt using SHA-256 with 100,000 iterations.
 */
async function derivePbkdf2Key(
  passphrase: string,
  salt: Uint8Array,
  usages: KeyUsage[] = ['encrypt', 'decrypt']
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

/**
 * Hashes a master PIN or password using PBKDF2 with SHA-256 (100,000 rounds)
 * and a cryptographically secure 16-byte salt.
 */
export async function hashMasterKey(
  passphrase: string,
  saltHex?: string
): Promise<{ hashHex: string; saltHex: string }> {
  const salt = saltHex ? hexToBuffer(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return {
    hashHex: bufferToHex(derivedBits),
    saltHex: bufferToHex(salt),
  };
}

/**
 * Verifies a passphrase against stored hash and salt.
 */
export async function verifyMasterKey(
  passphrase: string,
  expectedHashHex: string,
  saltHex: string
): Promise<boolean> {
  try {
    const { hashHex } = await hashMasterKey(passphrase, saltHex);
    return hashHex.toLowerCase() === expectedHashHex.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Encrypts a JSON-serializable object with a user password using AES-256-GCM.
 */
export async function encryptJsonPayload(data: unknown, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePbkdf2Key(passphrase, salt, ['encrypt']);

  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(JSON.stringify(data));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintextBuffer
  );

  const payload = {
    omnidesk_encrypted: true,
    version: 1,
    algo: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256-100K',
    createdAt: new Date().toISOString(),
    saltHex: bufferToHex(salt),
    ivHex: bufferToHex(iv),
    cipherHex: bufferToHex(cipherBuffer),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Decrypts an encrypted payload JSON using AES-256-GCM.
 */
export async function decryptJsonPayload(
  payloadString: string,
  passphrase: string
): Promise<unknown> {
  let parsed: {
    omnidesk_encrypted?: boolean;
    saltHex?: string;
    ivHex?: string;
    cipherHex?: string;
  };

  try {
    parsed = JSON.parse(payloadString);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (!parsed.omnidesk_encrypted || !parsed.saltHex || !parsed.ivHex || !parsed.cipherHex) {
    throw new Error('Not an OmniDesk encrypted payload');
  }

  const salt = hexToBuffer(parsed.saltHex);
  const iv = hexToBuffer(parsed.ivHex);
  const cipherBuffer = hexToBuffer(parsed.cipherHex);

  const key = await derivePbkdf2Key(passphrase, salt, ['decrypt']);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    cipherBuffer as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  const decryptedText = decoder.decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}

export interface PasswordAnalysis {
  bits: number;
  crackTimeDisplay: string;
  score: number; // 0 to 4
  level: 'weak' | 'fair' | 'good' | 'excellent';
  checks: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    numbers: boolean;
    symbols: boolean;
  };
}

/**
 * Calculates entropy bits and estimated offline brute-force crack time for a password.
 */
export function calculateEntropy(password: string): PasswordAnalysis {
  const checks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return {
      bits: 0,
      crackTimeDisplay: '< 1 second',
      score: 0,
      level: 'weak',
      checks,
    };
  }

  let poolSize = 0;
  if (checks.lower) poolSize += 26;
  if (checks.upper) poolSize += 26;
  if (checks.numbers) poolSize += 10;
  if (checks.symbols) poolSize += 33;
  if (poolSize === 0) poolSize = 26;

  // Bits of entropy: length * log2(poolSize)
  const bits = Math.round(password.length * Math.log2(poolSize));

  // Assumes a modern offline cracking rig doing 10 billion guesses/sec
  const guessesPerSecond = 10_000_000_000;
  const totalCombinations = Math.pow(poolSize, password.length);
  const secondsToCrack = totalCombinations / (2 * guessesPerSecond);

  let crackTimeDisplay = '< 1 second';
  if (secondsToCrack >= 31536000 * 1000) {
    crackTimeDisplay = '> 1,000 years';
  } else if (secondsToCrack >= 31536000) {
    const years = Math.round(secondsToCrack / 31536000);
    crackTimeDisplay = `~ ${years} ${years === 1 ? 'year' : 'years'}`;
  } else if (secondsToCrack >= 86400) {
    const days = Math.round(secondsToCrack / 86400);
    crackTimeDisplay = `~ ${days} ${days === 1 ? 'day' : 'days'}`;
  } else if (secondsToCrack >= 3600) {
    const hours = Math.round(secondsToCrack / 3600);
    crackTimeDisplay = `~ ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else if (secondsToCrack >= 60) {
    const minutes = Math.round(secondsToCrack / 60);
    crackTimeDisplay = `~ ${minutes} minutes`;
  } else if (secondsToCrack >= 1) {
    crackTimeDisplay = `~ ${Math.round(secondsToCrack)} seconds`;
  }

  let score = 0;
  if (bits >= 80 && password.length >= 14) score = 4;
  else if (bits >= 60 && password.length >= 10) score = 3;
  else if (bits >= 45 && password.length >= 8) score = 2;
  else if (bits >= 28) score = 1;

  const levelMap: Record<number, 'weak' | 'fair' | 'good' | 'excellent'> = {
    0: 'weak',
    1: 'weak',
    2: 'fair',
    3: 'good',
    4: 'excellent',
  };

  return {
    bits,
    crackTimeDisplay,
    score,
    level: levelMap[score],
    checks,
  };
}

export interface StorageAuditItem {
  key: string;
  bytes: number;
  category: 'security' | 'user' | 'config' | 'cache';
}

/**
 * Scans localStorage and returns a structured audit of stored items.
 */
export function getStorageAudit(): StorageAuditItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  const items: StorageAuditItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) || '';
      const bytes = new Blob([key + value]).size;

      let category: 'security' | 'user' | 'config' | 'cache' = 'config';
      if (key.includes('security') || key.includes('auth') || key.includes('lock')) {
        category = 'security';
      } else if (key.includes('notes') || key.includes('tasks') || key.includes('recent')) {
        category = 'user';
      } else if (key.includes('cache') || key.includes('currency') || key.includes('crypto')) {
        category = 'cache';
      }

      items.push({ key, bytes, category });
    }
  } catch (e) {
    console.error('Storage audit error:', e);
  }

  return items.sort((a, b) => b.bytes - a.bytes);
}

/**
 * Purges user-specific sensitive notes and tasks from localStorage.
 */
export function purgeSensitiveData(): void {
  try {
    const raw = localStorage.getItem('omnidesk_user_config_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.widgets) {
        parsed.widgets.quickNote = '';
        parsed.widgets.dailyTasks = [];
      }
      localStorage.setItem('omnidesk_user_config_v2', JSON.stringify(parsed, null, 2));
    }
    // Also remove any standalone note/scratchpad keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('note') || key.includes('sketch') || key.includes('scratch'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Failed to purge sensitive data:', e);
  }
}
