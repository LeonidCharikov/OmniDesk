import React, { useEffect, useMemo, useState } from 'react';
import { Copy, AlertCircle, Clock, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { decodeJwtToken, signJwtHmac, verifyJwtHmac, type DecodedJwt } from '../../utils/toolUpgrades.logic';
import { btn, secondary, input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   JWT DECODER, HMAC VERIFIER & TEST SIGNER
   ───────────────────────────────────────────────────────────── */
const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBOb3bDoWsiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjA4NzE2NDAwMCwicm9sZXMiOlsidXNlciIsImFkbWluIl19.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export const JwtDecoderTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'decode' | 'sign'>('decode');
  const [token, setToken] = useState(SAMPLE_JWT);
  const [verifySecret, setVerifySecret] = useState('');
  const [verifyState, setVerifyState] = useState<null | { valid: boolean; alg: string; supported: boolean }>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Signer state
  const [signAlg, setSignAlg] = useState<'HS256' | 'HS384' | 'HS512'>('HS256');
  const [signSecret, setSignSecret] = useState('my-local-dev-secret');
  const [signPayloadText, setSignPayloadText] = useState(() =>
    JSON.stringify(
      {
        sub: 'user_42',
        name: 'OmniDesk Developer',
        roles: ['admin'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      null,
      2
    )
  );
  const [signedToken, setSignedToken] = useState('');
  const [signError, setSignError] = useState('');

  const decodedResult = useMemo<{ decoded: DecodedJwt | null; error: string }>(() => {
    if (!token.trim()) return { decoded: null, error: '' };
    try {
      return { decoded: decodeJwtToken(token), error: '' };
    } catch (e) {
      return {
        decoded: null,
        error: e instanceof Error ? e.message : t('invalid_jwt', 'Invalid JWT token.'),
      };
    }
  }, [token, t]);

  useEffect(() => {
    if (!verifySecret || !decodedResult.decoded) {
      setVerifyState(null);
      return;
    }
    let active = true;
    void verifyJwtHmac(token, verifySecret)
      .then(res => {
        if (active) setVerifyState(res);
      })
      .catch(() => {
        if (active) setVerifyState(null);
      });
    return () => {
      active = false;
    };
  }, [token, verifySecret, decodedResult.decoded]);

  const handleSign = async () => {
    setSignError('');
    try {
      const payload = JSON.parse(signPayloadText) as Record<string, unknown>;
      const jwt = await signJwtHmac({ typ: 'JWT' }, payload, signSecret, signAlg);
      setSignedToken(jwt);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : t('err_invalid_json', 'Invalid JSON payload.'));
    }
  };

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const decoded = decodedResult.decoded;
  const headerJson = decoded ? JSON.stringify(decoded.header, null, 2) : '';
  const payloadJson = decoded ? JSON.stringify(decoded.payload, null, 2) : '';

  return (
    <div className="space-y-5">
      <Header
        title="JWT Decoder"
        desc={t('jwt_decoder_desc', 'Decode JWT claims, verify HS256/HS384/HS512 signatures via Web Crypto, and sign test tokens 100% locally.')}
      />

      <div className={box + ' space-y-4'}>
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'decode' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setMode('decode')}
          >
            {t('jwt_mode_decode', 'Decode & Verify')}
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'sign' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setMode('sign')}
          >
            <KeyRound className="w-3.5 h-3.5 inline mr-1" />
            {t('jwt_mode_sign', 'Build & Sign HMAC JWT')}
          </button>
        </div>

        {mode === 'decode' ? (
          <div className="space-y-4">
            <textarea
              className={input + ' min-h-24 font-mono text-xs break-all'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={t('jwt_placeholder', 'Paste a JWT token (optional "Bearer " prefix is automatically stripped)…')}
            />

            {decodedResult.error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{decodedResult.error}</span>
              </div>
            )}

            {decoded && (
              <>
                {/* Claim Timing Badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                    alg: <strong className="text-indigo-300">{decoded.alg}</strong>
                  </span>
                  {decoded.expDate && (
                    <span
                      className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${
                        decoded.isExpired
                          ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                          : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {decoded.isExpired ? t('token_expired', 'Expired') : t('token_valid', 'Valid')} · {decoded.expDate.toLocaleString()}
                    </span>
                  )}
                  {decoded.iatDate && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                      iat: {decoded.iatDate.toLocaleString()}
                    </span>
                  )}
                  {decoded.nbfDate && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                      nbf: {decoded.nbfDate.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Local HMAC Verification */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="text-xs text-slate-300 font-medium block">
                    {t('jwt_verify_secret_label', 'Verify Signature Locally (HMAC HS256 / HS384 / HS512 secret):')}
                  </label>
                  <input
                    className={input + ' font-mono text-xs'}
                    type="text"
                    value={verifySecret}
                    onChange={e => setVerifySecret(e.target.value)}
                    placeholder={t('jwt_secret_placeholder', 'Enter HMAC secret to verify signature…')}
                  />
                  {verifyState && (
                    <div
                      className={`text-xs flex items-center gap-2 pt-1 ${
                        !verifyState.supported
                          ? 'text-amber-300'
                          : verifyState.valid
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                      }`}
                    >
                      {verifyState.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      <span>
                        {!verifyState.supported
                          ? t('jwt_alg_unsupported', 'Offline HMAC check only supports HS256/HS384/HS512 (token uses {alg}).', { alg: verifyState.alg })
                          : verifyState.valid
                            ? t('jwt_sig_valid', 'Signature verified ({alg}).', { alg: verifyState.alg })
                            : t('jwt_sig_invalid', 'Invalid signature for the provided secret.')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-rose-400">{t('jwt_header_title', 'HEADER: Algorithm & Token Type')}</span>
                      <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300" onClick={() => copyText('hdr', headerJson)}>
                        <Copy className="inline w-3 h-3 mr-1" />
                        {copiedKey === 'hdr' ? t('copied', 'Copied!') : t('copy', 'Copy')}
                      </button>
                    </div>
                    <pre className={box + ' whitespace-pre-wrap text-xs font-mono text-rose-300 min-h-36 max-h-72 overflow-auto'}>
                      {headerJson}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-semibold text-purple-400">{t('jwt_payload_title', 'PAYLOAD: Claims & Data')}</span>
                      <div className="flex items-center gap-2">
                        <SendToToolButton sourceToolId="jwt-decoder" kind="text" getText={() => payloadJson} />
                        <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300" onClick={() => copyText('pay', payloadJson)}>
                          <Copy className="inline w-3 h-3 mr-1" />
                          {copiedKey === 'pay' ? t('copied', 'Copied!') : t('copy', 'Copy')}
                        </button>
                      </div>
                    </div>
                    <pre className={box + ' whitespace-pre-wrap text-xs font-mono text-purple-300 min-h-36 max-h-72 overflow-auto'}>
                      {payloadJson}
                    </pre>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-sky-400">{t('jwt_signature_title', 'SIGNATURE')}</span>
                  <pre className={box + ' break-all text-xs font-mono text-sky-300'}>{decoded.signature}</pre>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">
                {t('jwt_algorithm', 'HMAC Algorithm')}
                <select className={input + ' mt-1'} value={signAlg} onChange={e => setSignAlg(e.target.value as typeof signAlg)}>
                  <option value="HS256">HS256 (HMAC-SHA256)</option>
                  <option value="HS384">HS384 (HMAC-SHA384)</option>
                  <option value="HS512">HS512 (HMAC-SHA512)</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">
                {t('jwt_signing_secret', 'Signing Secret')}
                <input className={input + ' mt-1 font-mono'} value={signSecret} onChange={e => setSignSecret(e.target.value)} />
              </label>
            </div>
            <label className="text-xs text-slate-400 block">
              {t('jwt_payload_json_label', 'Payload JSON')}
              <textarea
                className={input + ' mt-1 min-h-40 font-mono text-xs'}
                value={signPayloadText}
                onChange={e => setSignPayloadText(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => void handleSign()}>
                {t('jwt_generate_btn', 'Sign & Generate JWT')}
              </button>
              {signedToken && (
                <button
                  type="button"
                  className={secondary}
                  onClick={() => {
                    setToken(signedToken);
                    setVerifySecret(signSecret);
                    setMode('decode');
                  }}
                >
                  {t('jwt_inspect_generated', 'Inspect in Decoder')}
                </button>
              )}
            </div>
            {signError && <p className="text-xs text-rose-400">{signError}</p>}
            {signedToken && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-400 font-medium">{t('jwt_signed_output', 'Signed JWT:')}</span>
                  <button type="button" className="text-indigo-400 hover:text-indigo-300" onClick={() => copyText('signed', signedToken)}>
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {copiedKey === 'signed' ? t('copied', 'Copied!') : t('copy', 'Copy')}
                  </button>
                </div>
                <pre className="font-mono text-xs text-slate-200 break-all whitespace-pre-wrap">{signedToken}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
