import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, CloudRain, Waves, Wind, Radio } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type ChannelId = 'white' | 'pink' | 'brown' | 'rain' | 'waves' | 'wind';

interface ChannelDef {
  id: ChannelId;
  labelKey: string;
  fallback: string;
}

const CHANNELS: ChannelDef[] = [
  { id: 'rain', labelKey: 'an_ch_rain', fallback: 'Soft Rain' },
  { id: 'waves', labelKey: 'an_ch_waves', fallback: 'Ocean Waves' },
  { id: 'wind', labelKey: 'an_ch_wind', fallback: 'Gentle Wind' },
  { id: 'brown', labelKey: 'an_ch_brown', fallback: 'Brown Noise (Deep)' },
  { id: 'pink', labelKey: 'an_ch_pink', fallback: 'Pink Noise (Warm)' },
  { id: 'white', labelKey: 'an_ch_white', fallback: 'White Noise' },
];

function createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }
  } else {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 1.8;
    }
  }
  return buffer;
}

export const AmbientNoiseMixerTool: React.FC = () => {
  const { t } = useI18n();
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const channelGainsRef = useRef<Partial<Record<ChannelId, GainNode>>>({});
  const timerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVol, setMasterVol] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [volumes, setVolumes] = useState<Record<ChannelId, number>>({
    rain: 0.65,
    waves: 0.25,
    wind: 0,
    brown: 0.35,
    pink: 0,
    white: 0,
  });
  const [sleepMin, setSleepMin] = useState<number>(0);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);

  const stopAudio = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSleepRemainingSec(null);
    if (ctxRef.current) {
      void ctxRef.current.close();
      ctxRef.current = null;
    }
    channelGainsRef.current = {};
    masterGainRef.current = null;
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (ctxRef.current) void ctxRef.current.close();
    };
  }, []);

  const startAudio = () => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = muted ? 0 : masterVol;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const whiteBuf = createNoiseBuffer(ctx, 'white');
    const pinkBuf = createNoiseBuffer(ctx, 'pink');
    const brownBuf = createNoiseBuffer(ctx, 'brown');

    const attachChannel = (id: ChannelId, buf: AudioBuffer, filterFreq?: number, filterType: BiquadFilterType = 'lowpass', lfoHz?: number) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = volumes[id];
      channelGainsRef.current[id] = gain;

      if (filterFreq) {
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        src.connect(filter);

        if (lfoHz) {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = lfoHz;
          lfoGain.gain.value = filterFreq * 0.45;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          lfo.start();
        }
        filter.connect(gain);
      } else {
        src.connect(gain);
      }

      gain.connect(master);
      src.start();
    };

    attachChannel('white', whiteBuf);
    attachChannel('pink', pinkBuf);
    attachChannel('brown', brownBuf);
    attachChannel('rain', pinkBuf, 1800, 'bandpass');
    attachChannel('waves', brownBuf, 520, 'lowpass', 0.12);
    attachChannel('wind', pinkBuf, 650, 'bandpass', 0.18);

    setIsPlaying(true);

    if (sleepMin > 0) {
      setSleepRemainingSec(sleepMin * 60);
      timerRef.current = window.setInterval(() => {
        setSleepRemainingSec(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            stopAudio();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(muted ? 0 : masterVol, ctxRef.current.currentTime, 0.05);
    }
  }, [masterVol, muted]);

  const updateChannel = (id: ChannelId, val: number) => {
    setVolumes(prev => ({ ...prev, [id]: val }));
    const node = channelGainsRef.current[id];
    if (node && ctxRef.current) {
      node.gain.setTargetAtTime(val, ctxRef.current.currentTime, 0.05);
    }
  };

  const applyPreset = (preset: Record<ChannelId, number>) => {
    setVolumes(preset);
    (Object.keys(preset) as ChannelId[]).forEach(id => {
      const node = channelGainsRef.current[id];
      if (node && ctxRef.current) {
        node.gain.setTargetAtTime(preset[id], ctxRef.current.currentTime, 0.08);
      }
    });
  };

  const getIcon = (id: ChannelId) => {
    if (id === 'rain') return <CloudRain className="w-4 h-4 text-sky-400" />;
    if (id === 'waves') return <Waves className="w-4 h-4 text-cyan-400" />;
    if (id === 'wind') return <Wind className="w-4 h-4 text-emerald-400" />;
    return <Radio className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('an_title', 'Ambient Sound & White Noise Mixer')}</h2>
              <p className="text-xs text-slate-400">
                {t('an_subtitle', 'Offline Web Audio soundscape mixer for focus, relaxation, and sleep.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sleepRemainingSec !== null && (
              <span className="text-xs font-mono tabular-nums text-amber-300">
                {Math.floor(sleepRemainingSec / 60)}:{String(sleepRemainingSec % 60).padStart(2, '0')}
              </span>
            )}
            <select
              value={sleepMin}
              onChange={e => setSleepMin(Number(e.target.value))}
              disabled={isPlaying}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
            >
              <option value={0}>{t('an_no_timer', 'No sleep timer')}</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            {!isPlaying ? (
              <button
                type="button"
                onClick={startAudio}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{t('start', 'Start')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopAudio}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{t('an_stop', 'Stop')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Presets + Master */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset({ rain: 0.7, waves: 0.2, wind: 0, brown: 0.35, pink: 0, white: 0 })}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white"
            >
              {t('an_preset_rainy', 'Rainy Study')}
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ rain: 0, waves: 0, wind: 0, brown: 0.7, pink: 0.25, white: 0 })}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white"
            >
              {t('an_preset_focus', 'Deep Brown Focus')}
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ rain: 0.35, waves: 0.6, wind: 0.2, brown: 0.15, pink: 0, white: 0 })}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white"
            >
              {t('an_preset_coast', 'Calm Coast')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted(m => !m)}
              aria-label={t('an_mute', 'Mute')}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-400">{t('an_master', 'Master')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVol}
              onChange={e => setMasterVol(Number(e.target.value))}
              className="w-28 accent-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHANNELS.map(ch => (
            <div key={ch.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  {getIcon(ch.id)}
                  <span>{t(ch.labelKey, ch.fallback)}</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {Math.round(volumes[ch.id] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volumes[ch.id]}
                onChange={e => updateChannel(ch.id, Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
