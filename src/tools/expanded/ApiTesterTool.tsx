import React, { useState } from 'react';
import { Plus, Send, Copy, AlertCircle, Clock, X } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   8. API TESTER
   ───────────────────────────────────────────────────────────── */
export const ApiTesterTool: React.FC = () => {
  const { t } = useI18n();
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [headersList, setHeadersList] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [body, setBody] = useState('');
  const [resultBody, setResultBody] = useState('');
  const [resultHeaders, setResultHeaders] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addHeader = () => {
    setHeadersList([...headersList, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeadersList(headersList.filter((_, i) => i !== index));
  };

  const send = async () => {
    setBusy(true);
    setStatus(null);
    setStatusText('');
    setResultBody('');
    setResultHeaders({});
    setDurationMs(null);
    setErrorMsg('');

    const headersRecord: Record<string, string> = {};
    headersList.forEach(h => {
      if (h.key.trim()) headersRecord[h.key.trim()] = h.value;
    });

    const startTime = performance.now();
    try {
      const response = await fetch(url, {
        method,
        headers: headersRecord,
        body: method === 'GET' ? undefined : body || undefined,
      });
      const elapsed = Math.round(performance.now() - startTime);
      setDurationMs(elapsed);
      setStatus(response.status);
      setStatusText(response.statusText);

      const respHeaders: Record<string, string> = {};
      response.headers.forEach((val, k) => {
        respHeaders[k] = val;
      });
      setResultHeaders(respHeaders);

      const raw = await response.text();
      try {
        setResultBody(JSON.stringify(JSON.parse(raw), null, 2));
      } catch {
        setResultBody(raw);
      }
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      setDurationMs(elapsed);
      setErrorMsg(
        error instanceof Error
          ? `${error.message}. (${t('cors_note', 'Note: Browser blocks direct requests if the server does not allow CORS headers.')})`
          : t('request_failed', 'Request failed.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="API Tester" description={t('api_tester_desc', 'Send HTTP requests with custom headers and inspect response status and payloads.')} />
      <div className={panel + ' space-y-4'}>
        <div className="flex flex-wrap gap-2">
          <select
            className={input + ' w-28 shrink-0 font-semibold'}
            value={method}
            onChange={e => setMethod(e.target.value as typeof method)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            className={input + ' flex-1 min-w-[240px] font-mono text-xs'}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
          />
          <button className={button} disabled={busy || !url.trim()} onClick={send}>
            <Send className="inline w-3.5 h-3.5 mr-1" />
            {busy ? t('sending', 'Sending…') : t('send', 'Send')}
          </button>
        </div>

        {/* Headers configurator */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">{t('request_headers', 'Request Headers:')}</span>
            <button className="text-xs text-indigo-400 hover:text-indigo-300" onClick={addHeader}>
              <Plus className="inline w-3 h-3 mr-1" />
              {t('add_header', 'Add header')}
            </button>
          </div>
          {headersList.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className={input + ' font-mono text-xs'}
                placeholder={t('header_key_placeholder', 'Key (e.g., Authorization)')}
                value={h.key}
                onChange={e => {
                  const next = [...headersList];
                  next[i].key = e.target.value;
                  setHeadersList(next);
                }}
              />
              <input
                className={input + ' font-mono text-xs'}
                placeholder={t('header_val_placeholder', 'Value (e.g., Bearer token)')}
                value={h.value}
                onChange={e => {
                  const next = [...headersList];
                  next[i].value = e.target.value;
                  setHeadersList(next);
                }}
              />
              <button className="text-slate-500 hover:text-rose-400 p-1" onClick={() => removeHeader(i)} title={t('remove', 'Remove')}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {method !== 'GET' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium block">
              {t('json_request_body', 'Request Body:')}
            </label>
            <textarea
              className={input + ' min-h-28 font-mono text-xs'}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder='{\n  "title": "foo",\n  "completed": false\n}'
            />
          </div>
        )}

        {/* Response section */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    activeTab === 'body' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('body')}
                >
                  {t('response_body', 'Response Body')}
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    activeTab === 'headers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('headers')}
                >
                  {t('response_headers', 'Headers')} ({Object.keys(resultHeaders).length})
                </button>
              </div>

              {status !== null && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-semibold ${
                    status >= 200 && status < 300
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : status >= 400
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {status} {statusText}
                </span>
              )}

              {durationMs !== null && (
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {durationMs} ms
                </span>
              )}
            </div>

            {resultBody && (
              <button className={secondary} onClick={() => navigator.clipboard.writeText(resultBody)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {t('copy_response', 'Copy')}
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'body' ? (
            <pre className={panel + ' min-h-48 max-h-96 overflow-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed'}>
              {resultBody || t('no_response_yet', 'No response received yet.')}
            </pre>
          ) : (
            <div className={panel + ' min-h-48 max-h-96 overflow-auto font-mono text-xs space-y-1'}>
              {Object.entries(resultHeaders).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-slate-300 border-b border-slate-800/40 py-0.5">
                  <span className="text-indigo-400 font-medium shrink-0">{k}:</span>
                  <span className="break-all">{v}</span>
                </div>
              ))}
              {Object.keys(resultHeaders).length === 0 && (
                <p className="text-slate-500">{t('no_headers_received', 'No headers to display.')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
