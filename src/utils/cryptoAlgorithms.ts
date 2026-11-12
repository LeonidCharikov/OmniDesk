// Pure TypeScript cryptographic hashing, checksum, HMAC, and base encoding utilities
// Zero external dependencies; verified against RFC 1321, FIPS 180-4, FIPS 202, RFC 4648, and IEEE 802.3.

export function bytesToHex(bytes: Uint8Array, upper = false): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return upper ? out.toUpperCase() : out;
}

export function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/[\s:-]+/g, '');
  if (cleaned.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error('INVALID_HEX');
  }
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  if (!urlSafe) return b64;
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64ToBytes(b64: string): Uint8Array {
  let normalized = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) normalized += '=';
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

// =========================================================================
// MD5 (RFC 1321)
// =========================================================================
const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
}

export function md5(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((56 - ((data.length + 1) % 64)) + 64) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const sum = (A + F + MD5_K[i] + M[g]) >>> 0;
      const s = MD5_SHIFTS[i];
      const rotated = ((sum << s) | (sum >>> (32 - s))) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotated) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

// =========================================================================
// SHA-224 (FIPS 180-4) — WebCrypto lacks SHA-224
// =========================================================================
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr32 = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

export function sha224(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((56 - ((data.length + 1) % 64)) + 64) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);

  const H = new Uint32Array([
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
    0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4,
  ]);
  const W = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr32(W[i - 15], 7) ^ rotr32(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr32(W[i - 2], 17) ^ rotr32(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + W[i]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(28);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 7; i++) outView.setUint32(i * 4, H[i], false);
  return out;
}

// =========================================================================
// Keccak / SHA-3 (FIPS 202) using BigInt 64-bit lanes
// =========================================================================
const MASK64 = 0xffffffffffffffffn;
const KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const KECCAK_ROTC = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

function rotl64(x: bigint, n: number): bigint {
  if (n === 0) return x;
  const shift = BigInt(n);
  return ((x << shift) | (x >> (64n - shift))) & MASK64;
}

function keccakF1600(state: BigUint64Array): void {
  const C = new BigUint64Array(5);
  const D = new BigUint64Array(5);
  const B = new BigUint64Array(25);

  for (let round = 0; round < 24; round++) {
    // Theta
    for (let x = 0; x < 5; x++) {
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    }
    for (let i = 0; i < 25; i++) {
      state[i] ^= D[i % 5];
    }

    // Rho & Pi
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const idx = x + 5 * y;
        const newX = y;
        const newY = (2 * x + 3 * y) % 5;
        B[newX + 5 * newY] = rotl64(state[idx], KECCAK_ROTC[idx]);
      }
    }

    // Chi
    for (let y = 0; y < 5; y++) {
      const row = y * 5;
      for (let x = 0; x < 5; x++) {
        state[row + x] = B[row + x] ^ (~B[row + ((x + 1) % 5)] & B[row + ((x + 2) % 5)]);
      }
    }

    // Iota
    state[0] ^= KECCAK_RC[round];
  }
}

export function keccakHash(
  bits: 224 | 256 | 384 | 512,
  data: Uint8Array,
  isSha3 = true
): Uint8Array {
  const rateBytes = (1600 - bits * 2) / 8;
  const suffix = isSha3 ? 0x06 : 0x01;
  const state = new BigUint64Array(25);

  let offset = 0;
  while (offset + rateBytes <= data.length) {
    for (let i = 0; i < rateBytes / 8; i++) {
      const base = offset + i * 8;
      let lane = 0n;
      for (let b = 0; b < 8; b++) {
        lane |= BigInt(data[base + b]) << BigInt(b * 8);
      }
      state[i] ^= lane;
    }
    keccakF1600(state);
    offset += rateBytes;
  }

  const block = new Uint8Array(rateBytes);
  const rem = data.length - offset;
  if (rem > 0) block.set(data.subarray(offset));
  block[rem] ^= suffix;
  block[rateBytes - 1] ^= 0x80;

  for (let i = 0; i < rateBytes / 8; i++) {
    const base = i * 8;
    let lane = 0n;
    for (let b = 0; b < 8; b++) {
      lane |= BigInt(block[base + b]) << BigInt(b * 8);
    }
    state[i] ^= lane;
  }
  keccakF1600(state);

  const outBytes = bits / 8;
  const out = new Uint8Array(outBytes);
  let outIdx = 0;
  for (let i = 0; i < rateBytes / 8 && outIdx < outBytes; i++) {
    const lane = state[i];
    for (let b = 0; b < 8 && outIdx < outBytes; b++) {
      out[outIdx++] = Number((lane >> BigInt(b * 8)) & 0xffn);
    }
  }
  return out;
}

// =========================================================================
// CRC-32 (IEEE 802.3) & Adler-32 (RFC 1950)
// =========================================================================
const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[n] = c >>> 0;
}

export function crc32Bytes(data: Uint8Array): Uint8Array {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, crc, false);
  return out;
}

export function adler32Bytes(data: Uint8Array): Uint8Array {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  const val = ((b << 16) | a) >>> 0;
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, val, false);
  return out;
}

// =========================================================================
// Generic HMAC (RFC 2104)
// =========================================================================
export async function computeHmac(
  hashFn: (input: Uint8Array) => Promise<Uint8Array> | Uint8Array,
  blockSize: number,
  key: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  let normalizedKey = key;
  if (normalizedKey.length > blockSize) {
    normalizedKey = await hashFn(normalizedKey);
  }
  const keyBlock = new Uint8Array(blockSize);
  keyBlock.set(normalizedKey);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBlock[i] ^ 0x5c;
    iKeyPad[i] = keyBlock[i] ^ 0x36;
  }

  const innerInput = new Uint8Array(blockSize + message.length);
  innerInput.set(iKeyPad);
  innerInput.set(message, blockSize);
  const innerHash = await hashFn(innerInput);

  const outerInput = new Uint8Array(blockSize + innerHash.length);
  outerInput.set(oKeyPad);
  outerInput.set(innerHash, blockSize);
  return await hashFn(outerInput);
}

// =========================================================================
// WebCrypto SHA Helper
// =========================================================================
export async function webCryptoHash(
  algo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  data: Uint8Array
): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const buf = await crypto.subtle.digest(algo, copy.buffer);
  return new Uint8Array(buf);
}

// =========================================================================
// Base32 (RFC 4648 / Base32hex)
// =========================================================================
export const BASE32_RFC4648 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const BASE32_HEX = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

export function base32Encode(
  bytes: Uint8Array,
  alphabet = BASE32_RFC4648,
  padding = true
): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  if (padding) {
    while (output.length % 8 !== 0) {
      output += '=';
    }
  }
  return output;
}

export function base32Decode(str: string, alphabet = BASE32_RFC4648): Uint8Array {
  const clean = str.trim().replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error('INVALID_BASE32');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// =========================================================================
// Base58 (Bitcoin, Ripple, Flickr)
// =========================================================================
export const BASE58_BITCOIN = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const BASE58_RIPPLE = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
export const BASE58_FLICKR = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export function base58Encode(bytes: Uint8Array, alphabet = BASE58_BITCOIN): string {
  if (bytes.length === 0) return '';
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes++;

  const digits: number[] = [0];
  for (let i = zeroes; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = alphabet[0].repeat(zeroes);
  for (let i = digits.length - 1; i >= 0; i--) {
    out += alphabet[digits[i]];
  }
  return out;
}

export function base58Decode(str: string, alphabet = BASE58_BITCOIN): Uint8Array {
  const clean = str.trim();
  if (!clean) return new Uint8Array(0);

  let zeroes = 0;
  while (zeroes < clean.length && clean[zeroes] === alphabet[0]) zeroes++;

  const bytes: number[] = [0];
  for (let i = zeroes; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) throw new Error('INVALID_BASE58');
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  const payload = clean.length === zeroes ? [] : bytes.reverse();
  const res = new Uint8Array(zeroes + payload.length);
  for (let i = 0; i < payload.length; i++) {
    res[zeroes + i] = payload[i];
  }
  return res;
}
