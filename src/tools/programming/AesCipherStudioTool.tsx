import React, { useState, useId } from 'react';
import { Lock, Unlock, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { bytesToHex, hexToBytes, bytesToBase64, base64ToBytes } from '../../utils/cryptoAlgorithms';

type AesMode = 'AES-GCM' | 'AES-CBC' | 'AES-CTR';
type KeyBits = 128 | 192 | 256;
type KeySource = 'pbkdf2' | 'raw-utf8' | 'raw-hex';
type CipherFormat = 'base64' | 'hex';

export const AesCipherStudioTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<AesMode>('AES-GCM');
  const [keyBits, setKeyBits] = useState<KeyBits>(256);
  const [keySource, setKeySource] = useState<KeySource>('pbkdf2');
  const [cipherFormat, setCipherFormat] = useState<CipherFormat>('base64');

  const [keyInput, setKeyInput] = useState('omnidesk-secret-passphrase');
  const [ivHex, setIvHex] = useState(() => bytesToHex(crypto.getRandomValues(new Uint8Array(12))));
  const [saltHex, setSaltHex] = useState(() => bytesToHex(crypto.getRandomValues(new Uint8Array(16))));
  const [iterations, setIterations] = useState(100000);

  const [plaintext, setPlaintext] = useState('Confidential payload for AES encryption');
  const [ciphertext, setCiphertext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const plainId = useId();
  const cipherId = useId();

  const expectedIvLen = mode === 'AES-GCM' ? 12 : 16;

  const randomizeIv = () => {
    setIvHex(bytesToHex(crypto.getRandomValues(new Uint8Array(expectedIvLen))));
  };

  const randomizeSalt = () => {
    setSaltHex(bytesToHex(crypto.getRandomValues(new Uint8Array(16))));
  };

  const deriveCryptoKey = async (usage: KeyUsage): Promise<CryptoKey> => {
    const keyByteLen = keyBits / 8;
    if (keySource === 'pbkdf2') {
      const salt = hexToBytes(saltHex);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keyInput),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new Uint8Array(salt).buffer, iterations: Math.max(1000, iterations), hash: 'SHA-256' },
        baseKey,
        { name: mode, length: keyBits },
        false,
        [usage]
      );
    }

    let rawBytes: Uint8Array;
    if (keySource === 'raw-hex') {
      rawBytes = hexToBytes(keyInput);
    } else {
      rawBytes = new TextEncoder().encode(keyInput);
    }
    const sized = new Uint8Array(keyByteLen);
    sized.set(rawBytes.slice(0, keyByteLen));
    return await crypto.subtle.importKey('raw', sized.buffer, { name: mode, length: keyBits }, false, [usage]);
  };

  const getAlgorithmParams = (): AesGcmParams | AesCbcParams | AesCtrParams => {
    const iv = hexToBytes(ivHex);
    if (iv.length !== expectedIvLen) {
      throw new Error(t('aes_invalid_iv_len', 'IV must be {bytes} bytes ({hexLen} hex chars) for {mode}.', {
        bytes: expectedIvLen,
        hexLen: expectedIvLen * 2,
        mode,
      }));
    }
    const ivBuf = new Uint8Array(iv).buffer;
    if (mode === 'AES-GCM') return { name: 'AES-GCM', iv: ivBuf };
    if (mode === 'AES-CBC') return { name: 'AES-CBC', iv: ivBuf };
    return { name: 'AES-CTR', counter: ivBuf, length: 64 };
  };

  const handleEncrypt = async () => {
    setError(null);
    try {
      const key = await deriveCryptoKey('encrypt');
      const params = getAlgorithmParams();
      const data = new TextEncoder().encode(plaintext);
      const encBuf = await crypto.subtle.encrypt(params, key, data.buffer);
      const bytes = new Uint8Array(encBuf);
      setCiphertext(cipherFormat === 'base64' ? bytesToBase64(bytes) : bytesToHex(bytes));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('err_encryption_failed', 'Encryption failed.'));
    }
  };

  const handleDecrypt = async () => {
    setError(null);
    try {
      const key = await deriveCryptoKey('decrypt');
      const params = getAlgorithmParams();
      const cipherBytes = cipherFormat === 'base64' ? base64ToBytes(ciphertext) : hexToBytes(ciphertext);
      const decBuf = await crypto.subtle.decrypt(params, key, new Uint8Array(cipherBytes).buffer);
      setPlaintext(new TextDecoder('utf-8', { fatal: false }).decode(decBuf));
    } catch (e: unknown) {
      setError(e instanceof Error && e.message.includes('IV') ? e.message : t('decrypt_failed', 'Decryption failed: invalid key, IV, or ciphertext.'));
    }
  };

  const copyCipher = () => {
    navigator.clipboard.writeText(ciphertext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            {t('tool_aes_cipher_studio_title', 'AES Cipher & PBKDF2 Studio')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_aes_cipher_studio_desc', 'Configurable AES-GCM, AES-CBC, and AES-CTR encryption with 128/192/256-bit keys, custom IV, and PBKDF2 derivation.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleEncrypt()}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            {t('encrypt', 'Encrypt')}
          </button>
          <button
            onClick={() => void handleDecrypt()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" />
            {t('decrypt', 'Decrypt')}
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('aes_mode', 'Cipher Mode')}</span>
            <select
              value={mode}
              onChange={e => {
                const nm = e.target.value as AesMode;
                setMode(nm);
                const len = nm === 'AES-GCM' ? 12 : 16;
                setIvHex(bytesToHex(crypto.getRandomValues(new Uint8Array(len))));
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            >
              <option value="AES-GCM">AES-GCM (AEAD)</option>
              <option value="AES-CBC">AES-CBC</option>
              <option value="AES-CTR">AES-CTR</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('aes_key_size', 'Key Size')}</span>
            <select
              value={keyBits}
              onChange={e => setKeyBits(Number(e.target.value) as KeyBits)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            >
              <option value={128}>128-bit</option>
              <option value={192}>192-bit</option>
              <option value={256}>256-bit</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('aes_key_source', 'Key Mode')}</span>
            <select
              value={keySource}
              onChange={e => setKeySource(e.target.value as KeySource)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            >
              <option value="pbkdf2">PBKDF2 (Passphrase)</option>
              <option value="raw-utf8">{t('aes_raw_utf8', 'Raw Key (UTF-8 padded)')}</option>
              <option value="raw-hex">{t('aes_raw_hex', 'Raw Key (Hex padded)')}</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('aes_cipher_format', 'Ciphertext Format')}</span>
            <select
              value={cipherFormat}
              onChange={e => setCipherFormat(e.target.value as CipherFormat)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            >
              <option value="base64">Base64</option>
              <option value="hex">Hex</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('aes_secret_input', 'Passphrase / Secret Key')}</span>
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">IV / Nonce (Hex, {expectedIvLen}B)</span>
              <button onClick={randomizeIv} className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {t('aes_randomize', 'Randomize')}
              </button>
            </div>
            <input
              type="text"
              value={ivHex}
              onChange={e => setIvHex(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300"
            />
          </div>
        </div>

        {keySource === 'pbkdf2' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{t('aes_pbkdf2_salt', 'PBKDF2 Salt (Hex)')}</span>
                <button onClick={randomizeSalt} className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  {t('aes_randomize', 'Randomize')}
                </button>
              </div>
              <input
                type="text"
                value={saltHex}
                onChange={e => setSaltHex(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('aes_pbkdf2_iterations', 'PBKDF2 Iterations')}</span>
              <input
                type="number"
                min={1000}
                max={1000000}
                step={10000}
                value={iterations}
                onChange={e => setIterations(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Plaintext & Ciphertext */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={plainId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('aes_plaintext', 'Plaintext (UTF-8)')}
          </label>
          <textarea
            id={plainId}
            value={plaintext}
            onChange={e => setPlaintext(e.target.value)}
            rows={7}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={cipherId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('aes_ciphertext', 'Ciphertext')} ({cipherFormat.toUpperCase()})
            </label>
            <button onClick={copyCipher} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
            </button>
          </div>
          <textarea
            id={cipherId}
            value={ciphertext}
            onChange={e => setCiphertext(e.target.value)}
            rows={7}
            placeholder={t('aes_cipher_placeholder', 'Encrypted output appears here (or paste ciphertext to decrypt)...')}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};
