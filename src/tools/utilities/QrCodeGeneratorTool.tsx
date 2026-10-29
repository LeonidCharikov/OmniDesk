import React, { useState, useEffect, useRef, useId } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Wifi, Link, AlignLeft, Sparkles, Copy, Check } from 'lucide-react';

export const QrCodeGeneratorTool: React.FC = () => {
  const [qrType, setQrType] = useState<'url' | 'wifi' | 'text'>('url');
  const [url, setUrl] = useState<string>('https://github.com/tauri-apps/tauri');
  const [text, setText] = useState<string>('OmniDesk - 100% Offline Multi-Tool Platform');

  // WiFi state
  const [ssid, setSsid] = useState<string>('MojeDomaciWifi');
  const [wifiPassword, setWifiPassword] = useState<string>('TajneHeslo123');
  const [encryption, setEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');

  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const urlInputId = useId();
  const textInputId = useId();
  const ssidInputId = useId();
  const wifiPasswordId = useId();
  const encryptionSelectId = useId();

  // Generate QR payload
  const getPayload = () => {
    if (qrType === 'url') return url || 'https://tauri.app';
    if (qrType === 'text') return text || 'OmniDesk';
    // WiFi standard format: WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
    return `WIFI:T:${encryption};S:${ssid};P:${wifiPassword};;`;
  };

  useEffect(() => {
    const payload = getPayload();
    QRCode.toDataURL(payload, {
      width: 380,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setDataUrl(url))
      .catch(err => console.error(err));
  }, [qrType, url, text, ssid, wifiPassword, encryption]);

  const downloadQrPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qrcode_${qrType}.png`;
    a.click();
  };

  const copyQrImage = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy raw payload text
      navigator.clipboard.writeText(getPayload());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Generátor QR Kódů (100% Offline)</h2>
          <p className="text-sm text-slate-400 mt-1">
            Blesková tvorba QR kódů pro webové odkazy, Wi-Fi sítě i textové zprávy přímo v paměti.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setQrType('url')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              qrType === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            Webový odkaz
          </button>
          <button
            onClick={() => setQrType('wifi')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              qrType === 'wifi' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            Wi-Fi síť
          </button>
          <button
            onClick={() => setQrType('text')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              qrType === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Volný text
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-6 items-start">
        {/* Form Inputs */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          {qrType === 'url' && (
            <div className="space-y-2">
              <label htmlFor={urlInputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Cílová URL adresa
              </label>
              <input
                id={urlInputId}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {qrType === 'wifi' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor={ssidInputId} className="text-xs text-slate-400">Název sítě (SSID):</label>
                <input
                  id={ssidInputId}
                  type="text"
                  value={ssid}
                  onChange={e => setSsid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={wifiPasswordId} className="text-xs text-slate-400">Heslo k Wi-Fi:</label>
                <input
                  id={wifiPasswordId}
                  type="text"
                  value={wifiPassword}
                  onChange={e => setWifiPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={encryptionSelectId} className="text-xs text-slate-400">Zabezpečení:</label>
                <select
                  id={encryptionSelectId}
                  value={encryption}
                  onChange={e => setEncryption(e.target.value as 'WPA' | 'WEP' | 'nopass')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="WPA">WPA / WPA2 / WPA3 (Doporučeno)</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Bez hesla (Otevřená síť)</option>
                </select>
              </div>
            </div>
          )}

          {qrType === 'text' && (
            <div className="space-y-2">
              <label htmlFor={textInputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Textový obsah
              </label>
              <textarea
                id={textInputId}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            QR kód se generuje v reálném čase bez volání externích serverů nebo API.
          </div>
        </div>

        {/* QR Code Display & Actions */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center space-y-4">
          <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="Vygenerovaný QR kód" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">Generuji...</div>
            )}
          </div>

          <div className="w-full flex items-center gap-2">
            <button
              onClick={copyQrImage}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Zkopírováno' : 'Kopírovat'}
            </button>
            <button
              onClick={downloadQrPng}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Stáhnout PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
