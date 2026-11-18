import {
  md5,
  sha224,
  keccakHash,
  crc32Bytes,
  adler32Bytes,
  webCryptoHash,
  computeHmac,
} from '../utils/cryptoAlgorithms';

export interface HashWorkerRequest {
  requestId: number;
  data: Uint8Array;
  hmacEnabled: boolean;
  hmacKeyBytes: Uint8Array | null;
}

export interface HashWorkerDigestItem {
  id: string;
  labelPrefix: string;
  baseLabel: string;
  group: 'checksum' | 'classic' | 'sha2' | 'sha3' | 'keccak';
  bits: number;
  digest: Uint8Array;
}

export interface HashWorkerResponse {
  requestId: number;
  ok: boolean;
  items?: HashWorkerDigestItem[];
  error?: string;
}

self.onmessage = async (event: MessageEvent<HashWorkerRequest>) => {
  const { requestId, data, hmacEnabled, hmacKeyBytes } = event.data;

  try {
    const runAlgo = async (
      fn: (d: Uint8Array) => Promise<Uint8Array> | Uint8Array,
      blockSize: number
    ): Promise<Uint8Array> => {
      if (hmacEnabled && hmacKeyBytes) {
        return await computeHmac(fn, blockSize, hmacKeyBytes, data);
      }
      return await fn(data);
    };

    const items: HashWorkerDigestItem[] = [];

    if (!hmacEnabled) {
      items.push(
        { id: 'crc32', labelPrefix: '', baseLabel: 'CRC-32', group: 'checksum', bits: 32, digest: crc32Bytes(data) },
        { id: 'adler32', labelPrefix: '', baseLabel: 'Adler-32', group: 'checksum', bits: 32, digest: adler32Bytes(data) }
      );
    }

    const [
      md5Buf,
      sha1Buf,
      sha224Buf,
      sha256Buf,
      sha384Buf,
      sha512Buf,
      sha3_224Buf,
      sha3_256Buf,
      sha3_384Buf,
      sha3_512Buf,
      kec_224Buf,
      kec_256Buf,
      kec_384Buf,
      kec_512Buf,
    ] = await Promise.all([
      runAlgo(md5, 64),
      runAlgo(d => webCryptoHash('SHA-1', d), 64),
      runAlgo(sha224, 64),
      runAlgo(d => webCryptoHash('SHA-256', d), 64),
      runAlgo(d => webCryptoHash('SHA-384', d), 128),
      runAlgo(d => webCryptoHash('SHA-512', d), 128),
      runAlgo(d => keccakHash(224, d, true), 144),
      runAlgo(d => keccakHash(256, d, true), 136),
      runAlgo(d => keccakHash(384, d, true), 104),
      runAlgo(d => keccakHash(512, d, true), 72),
      runAlgo(d => keccakHash(224, d, false), 144),
      runAlgo(d => keccakHash(256, d, false), 136),
      runAlgo(d => keccakHash(384, d, false), 104),
      runAlgo(d => keccakHash(512, d, false), 72),
    ]);

    const prefix = hmacEnabled ? 'HMAC-' : '';
    items.push(
      { id: 'md5', labelPrefix: prefix, baseLabel: 'MD5', group: 'classic', bits: 128, digest: md5Buf },
      { id: 'sha1', labelPrefix: prefix, baseLabel: 'SHA-1', group: 'classic', bits: 160, digest: sha1Buf },
      { id: 'sha224', labelPrefix: prefix, baseLabel: 'SHA-224', group: 'sha2', bits: 224, digest: sha224Buf },
      { id: 'sha256', labelPrefix: prefix, baseLabel: 'SHA-256', group: 'sha2', bits: 256, digest: sha256Buf },
      { id: 'sha384', labelPrefix: prefix, baseLabel: 'SHA-384', group: 'sha2', bits: 384, digest: sha384Buf },
      { id: 'sha512', labelPrefix: prefix, baseLabel: 'SHA-512', group: 'sha2', bits: 512, digest: sha512Buf },
      { id: 'sha3-224', labelPrefix: prefix, baseLabel: 'SHA3-224', group: 'sha3', bits: 224, digest: sha3_224Buf },
      { id: 'sha3-256', labelPrefix: prefix, baseLabel: 'SHA3-256', group: 'sha3', bits: 256, digest: sha3_256Buf },
      { id: 'sha3-384', labelPrefix: prefix, baseLabel: 'SHA3-384', group: 'sha3', bits: 384, digest: sha3_384Buf },
      { id: 'sha3-512', labelPrefix: prefix, baseLabel: 'SHA3-512', group: 'sha3', bits: 512, digest: sha3_512Buf },
      { id: 'keccak-224', labelPrefix: prefix, baseLabel: 'Keccak-224', group: 'keccak', bits: 224, digest: kec_224Buf },
      { id: 'keccak-256', labelPrefix: prefix, baseLabel: 'Keccak-256', group: 'keccak', bits: 256, digest: kec_256Buf },
      { id: 'keccak-384', labelPrefix: prefix, baseLabel: 'Keccak-384', group: 'keccak', bits: 384, digest: kec_384Buf },
      { id: 'keccak-512', labelPrefix: prefix, baseLabel: 'Keccak-512', group: 'keccak', bits: 512, digest: kec_512Buf }
    );

    const response: HashWorkerResponse = {
      requestId,
      ok: true,
      items,
    };
    self.postMessage(response);
  } catch (err) {
    const response: HashWorkerResponse = {
      requestId,
      ok: false,
      error: err instanceof Error ? err.message : 'Hash worker error',
    };
    self.postMessage(response);
  }
};
