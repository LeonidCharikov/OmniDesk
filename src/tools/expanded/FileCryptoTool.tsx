import React, { useEffect, useState } from 'react';
import { Copy, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { btn, secondary, input, box, FilePicker, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   FILE CRYPTO TOOL (Direct ArrayBuffer reading, Multiple Hashes, AES-GCM)
   ───────────────────────────────────────────────────────────── */
export const FileCryptoTool: React.FC = () => {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAlgo, setSelectedAlgo] = useState<'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [hash, setHash] = useState('');
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | null>(null);
  const [cryptoError, setCryptoError] = useState('');

  const handleFileChange = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    setFileBytes(buf);
    // If text file, preview in text area
    if (file.size < 1000000 && !file.type.startsWith('image/')) {
      try {
        const str = new TextDecoder('utf-8', { fatal: true }).decode(buf);
        setText(str);
      } catch {
        setText(t('binary_file_preview', '[Binary file: {name}, size: {size} KB]', { name: file.name, size: (file.size / 1024).toFixed(1) }));
      }
    } else {
      setText(t('binary_file_preview', '[Binary file: {name}, size: {size} KB]', { name: file.name, size: (file.size / 1024).toFixed(1) }));
    }
  };

  useEffect(() => {
    const piped = consumePendingToolPipe('file-crypto');
    if (!piped) return;
    if (piped.kind === 'file' && piped.file) {
      void handleFileChange(piped.file);
    } else if (piped.kind === 'text' && typeof piped.text === 'string') {
      setText(piped.text);
    }
  }, []);

  const calculateHash = async () => {
    setCryptoError('');
    try {
      const dataToHash = fileBytes || new TextEncoder().encode(text);
      if (!dataToHash || (dataToHash instanceof ArrayBuffer && dataToHash.byteLength === 0 && !text)) {
        setCryptoError(t('err_enter_text_or_file', 'Enter text or load a file.'));
        return;
      }
      const digest = await crypto.subtle.digest(selectedAlgo, dataToHash);
      const hashStr = Array.from(new Uint8Array(digest))
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
      setHash(hashStr);
    } catch (e) {
      setCryptoError(e instanceof Error ? e.message : t('err_hash_failed', 'Hash calculation failed.'));
    }
  };

  const encrypt = async () => {
    setCryptoError('');
    if (!password) {
      setCryptoError(t('enter_password', 'Enter an encryption password.'));
      return;
    }
    try {
      const rawData = fileBytes ? new Uint8Array(fileBytes) : new TextEncoder().encode(text);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, rawData);
      const all = new Uint8Array(salt.length + iv.length + data.byteLength);
      all.set(salt);
      all.set(iv, salt.length);
      all.set(new Uint8Array(data), salt.length + iv.length);
      setEncrypted(btoa(String.fromCharCode(...all)));
    } catch (e) {
      setCryptoError(e instanceof Error ? e.message : t('err_encryption_failed', 'Encryption failed.'));
    }
  };

  const decrypt = async () => {
    setCryptoError('');
    if (!password) {
      setCryptoError(t('enter_password', 'Enter an encryption password.'));
      return;
    }
    try {
      const raw = atob(encrypted.trim());
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const salt = bytes.slice(0, 16);
      const iv = bytes.slice(16, 28);
      const ciphertext = bytes.slice(28);

      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      setDecrypted(new TextDecoder().decode(decryptedBuf));
    } catch {
      setCryptoError(t('decrypt_failed', 'Decryption failed: invalid key, IV, or ciphertext.'));
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="File Hashing & Encryption"
        desc={t('file_hashing_encryption_desc', 'Compute SHA-256, SHA-1, SHA-512 or encrypt/decrypt text and files with AES-GCM.')}
      />
      <div className={box + ' space-y-4'}>
        <FilePicker
          id="file-crypto-input"
          label={t('choose_file', 'Choose file')}
          fileName={fileName || undefined}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void handleFileChange(file);
          }}
        />

        <textarea
          className={input + ' min-h-32 font-mono text-xs'}
          value={text}
          onChange={e => {
            setText(e.target.value);
            setFileBytes(null);
          }}
          placeholder={t('text_or_file_content', 'Enter text or load any file…')}
        />

        {/* Algorithm & password section */}
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t('checksum_algo_label', 'Checksum Algorithm:')}</label>
            <div className="flex gap-2">
              <select
                className={input}
                value={selectedAlgo}
                onChange={e => setSelectedAlgo(e.target.value as typeof selectedAlgo)}
              >
                <option value="SHA-256">SHA-256 ({t('recommended', 'Recommended')})</option>
                <option value="SHA-512">SHA-512 ({t('max_security', 'Maximum security')})</option>
                <option value="SHA-384">SHA-384</option>
                <option value="SHA-1">SHA-1 ({t('legacy', 'Legacy')})</option>
              </select>
              <button className={btn} onClick={calculateHash}>
                {t('compute_algo', 'Compute {algo}', { algo: selectedAlgo })}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">{t('aes_password_label', 'Password for AES-GCM Encryption:')}</label>
            <div className="flex gap-2">
              <input
                className={input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('enter_secret_password', 'Enter secret password…')}
              />
              <button className={btn} onClick={encrypt}>
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                {t('encrypt', 'Encrypt')}
              </button>
              <button className={secondary} onClick={decrypt} disabled={!encrypted}>
                <Unlock className="w-3.5 h-3.5 inline mr-1" />
                {t('decrypt', 'Decrypt')}
              </button>
            </div>
          </div>
        </div>

        {cryptoError && (
          <div className="text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cryptoError}</span>
          </div>
        )}

        {hash && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{selectedAlgo} {t('hash_label', 'Hash:')}</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(hash)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy_hash', 'Copy hash')}
              </button>
            </div>
            <pre className={box + ' break-all text-emerald-400 font-mono text-xs'}>{hash}</pre>
          </div>
        )}

        {encrypted && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{t('ciphertext_label', 'Ciphertext (Base64 AES-GCM 256-bit):')}</span>
              <button className="text-amber-400 hover:text-amber-300" onClick={() => navigator.clipboard.writeText(encrypted)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy_ciphertext', 'Copy ciphertext')}
              </button>
            </div>
            <pre className={box + ' break-all text-amber-300 font-mono text-xs max-h-40 overflow-auto'}>{encrypted}</pre>
          </div>
        )}

        {decrypted && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{t('decrypted_result_label', 'Decrypted Output:')}</span>
              <button className="text-emerald-400 hover:text-emerald-300" onClick={() => navigator.clipboard.writeText(decrypted)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy', 'Copy')}
              </button>
            </div>
            <pre className={box + ' break-all text-emerald-300 font-mono text-xs max-h-40 overflow-auto'}>{decrypted}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
