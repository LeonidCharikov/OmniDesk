import React, { useEffect, useState } from 'react';
import { Copy, AlertCircle, Clock, Type } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { btn, input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   JWT DECODER
   ───────────────────────────────────────────────────────────── */
export const JwtDecoderTool: React.FC = () => {
  const { t } = useI18n();
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBOb3bDoWsiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjA4NzE2NDAwMCwicm9sZXMiOlsidXNlciIsImFkbWluIl19.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  );
  const [headerJson, setHeaderJson] = useState('');
  const [payloadJson, setPayloadJson] = useState('');
  const [signature, setSignature] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expStatus, setExpStatus] = useState<{ isExpired: boolean; dateStr: string } | null>(null);

  const decodeBase64Url = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const decode = () => {
    setErrorMsg('');
    setHeaderJson('');
    setPayloadJson('');
    setSignature('');
    setExpStatus(null);

    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) {
        throw new Error(t('jwt_invalid_format', 'A JWT token must have exactly 3 dot-separated parts (header.payload.signature).'));
      }
      const headerObj = JSON.parse(decodeBase64Url(parts[0]));
      const payloadObj = JSON.parse(decodeBase64Url(parts[1]));
      setHeaderJson(JSON.stringify(headerObj, null, 2));
      setPayloadJson(JSON.stringify(payloadObj, null, 2));
      setSignature(parts[2]);

      if (payloadObj.exp && typeof payloadObj.exp === 'number') {
        const expDate = new Date(payloadObj.exp * 1000);
        const isExpired = Date.now() > expDate.getTime();
        setExpStatus({ isExpired, dateStr: expDate.toLocaleString() });
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('invalid_jwt', 'Invalid JWT token.'));
    }
  };

  useEffect(() => {
    decode();
  }, []);

  return (
    <div className="space-y-5">
      <Header title="JWT Decoder" desc={t('jwt_decoder_desc', 'Decode JWT header and payload locally with expiration validation.')} />
      <div className={box + ' space-y-3'}>
        <textarea
          className={input + ' min-h-24 font-mono text-xs break-all'}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder={t('jwt_placeholder', 'Paste a JWT token…')}
        />
        <button className={btn} onClick={decode}>
          {t('decode', 'Decode')}
        </button>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {expStatus && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              expStatus.isExpired
                ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {expStatus.isExpired ? t('token_expired', 'Token is expired') : t('token_valid', 'Token is valid')}
              </span>
            </div>
            <span className="font-mono">{expStatus.dateStr}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-rose-400">{t('jwt_header_title', 'HEADER: Algorithm & Token Type')}</span>
              {headerJson && (
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                  onClick={() => navigator.clipboard.writeText(headerJson)}
                >
                  <Copy className="inline w-3 h-3 mr-1" />
                  {t('copy', 'Copy')}
                </button>
              )}
            </div>
            <pre className={box + ' whitespace-pre-wrap text-xs font-mono text-rose-300 min-h-36 max-h-72 overflow-auto'}>
              {headerJson || '—'}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-purple-400">{t('jwt_payload_title', 'PAYLOAD: Claims & Data')}</span>
              {payloadJson && (
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                  onClick={() => navigator.clipboard.writeText(payloadJson)}
                >
                  <Copy className="inline w-3 h-3 mr-1" />
                  {t('copy', 'Copy')}
                </button>
              )}
            </div>
            <pre className={box + ' whitespace-pre-wrap text-xs font-mono text-purple-300 min-h-36 max-h-72 overflow-auto'}>
              {payloadJson || '—'}
            </pre>
          </div>
        </div>

        {signature && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-sky-400">{t('jwt_signature_title', 'SIGNATURE')}</span>
            <pre className={box + ' break-all text-xs font-mono text-sky-300'}>{signature}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
