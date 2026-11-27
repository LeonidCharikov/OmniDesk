import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  Gauge,
  Grid,
  Maximize2,
  Minimize2,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  computeRefreshMetrics,
  GHOSTING_BACKGROUNDS,
  GhostingBackgroundPreset,
  PIXEL_TEST_COLORS,
  RefreshMetrics,
  snapStandardRefreshRate,
} from './monitorTester.logic';

type MonitorTab = 'deadpixel' | 'ghosting' | 'patterns' | 'refresh';
type PatternKind = 'gradient' | 'contrast' | 'sharpness' | 'uniformity';

export const MonitorTesterTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<MonitorTab>('deadpixel');

  // Dead pixel state
  const [colorIdx, setColorIdx] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [showOverlayHud, setShowOverlayHud] = useState(true);
  const [flasherActive, setFlasherActive] = useState(false);
  const [flashColorIdx, setFlashColorIdx] = useState(0);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);

  // Ghosting UFO test state
  const [ghostRunning, setGhostRunning] = useState(true);
  const [ghostSpeedPx, setGhostSpeedPx] = useState(480);
  const [ghostBgId, setGhostBgId] = useState<GhostingBackgroundPreset['id']>('cyan');
  const [ghostSpacing, setGhostSpacing] = useState(180);
  const ghostCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pattern state
  const [pattern, setPattern] = useState<PatternKind>('gradient');

  // Refresh rate & frame pacing state
  const [metrics, setMetrics] = useState<RefreshMetrics>({
    hz: 0,
    avgFrameMs: 0,
    minFrameMs: 0,
    maxFrameMs: 0,
    jitterMs: 0,
    droppedFrames: 0,
    sampleCount: 0,
  });
  const [frameHistory, setFrameHistory] = useState<number[]>([]);
  const deltasRef = useRef<number[]>([]);

  const activeColor = PIXEL_TEST_COLORS[colorIdx % PIXEL_TEST_COLORS.length];

  // Live refresh rate & frame pacing measurement
  useEffect(() => {
    let rafId = 0;
    let lastTs = 0;
    let lastUiUpdate = 0;

    const tick = (now: number) => {
      if (lastTs > 0) {
        const dt = now - lastTs;
        if (dt >= 1 && dt <= 200) {
          deltasRef.current.push(dt);
          if (deltasRef.current.length > 180) {
            deltasRef.current.splice(0, deltasRef.current.length - 180);
          }
        }
      }
      lastTs = now;

      if (now - lastUiUpdate >= 220 && deltasRef.current.length >= 4) {
        lastUiUpdate = now;
        const computed = computeRefreshMetrics(deltasRef.current);
        setMetrics(computed);
        setFrameHistory(deltasRef.current.slice(-64));
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Stuck pixel flasher (strictly opt-in, small 96px patch)
  useEffect(() => {
    if (!flasherActive) return;
    const id = window.setInterval(() => {
      setFlashColorIdx(prev => (prev + 1) % 3);
    }, 65);
    return () => window.clearInterval(id);
  }, [flasherActive]);

  // Fullscreen keyboard navigation for Dead Pixel Inspector
  const exitFullscreenInspector = useCallback(() => {
    setFullscreenOpen(false);
    setFlasherActive(false);
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const openFullscreenInspector = useCallback(() => {
    setFullscreenOpen(true);
    setShowOverlayHud(true);
    window.setTimeout(() => {
      const el = fullscreenRef.current;
      if (el && typeof el.requestFullscreen === 'function') {
        void el.requestFullscreen().catch(() => {
          // Iframe or sandbox fallback: fixed full-viewport overlay still covers the window
        });
      }
    }, 30);
  }, []);

  useEffect(() => {
    if (!fullscreenOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFullscreenInspector();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setColorIdx(prev => (prev + 1) % PIXEL_TEST_COLORS.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setColorIdx(prev => (prev - 1 + PIXEL_TEST_COLORS.length) % PIXEL_TEST_COLORS.length);
      } else if (e.key.toLowerCase() === 'h') {
        setShowOverlayHud(prev => !prev);
      }
    };
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        // Keep overlay open until user presses ESC or Close button if they only exited native FS
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [fullscreenOpen, exitFullscreenInspector]);

  // UFO Ghosting Canvas loop
  useEffect(() => {
    if (tab !== 'ghosting') return;
    const canvas = ghostCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgPreset =
      GHOSTING_BACKGROUNDS.find(b => b.id === ghostBgId) ?? GHOSTING_BACKGROUNDS[2];

    let rafId = 0;
    let lastTs = performance.now();
    const offsets = [0, 0, 0];
    const rowMultipliers = [0.5, 1.0, 1.75];

    const drawUfoSprite = (x: number, y: number, rowIdx: number) => {
      // Saucer dome
      ctx.fillStyle = rowIdx === 2 ? '#fbbf24' : rowIdx === 1 ? '#34d399' : '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 15, 9, 0, Math.PI, 0);
      ctx.fill();

      // High-contrast vertical edge strips (makes overdrive overshoot & ghosting trails obvious)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 24, y - 6, 48, 12);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 20, y - 4, 8, 8);
      ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillRect(x + 12, y - 4, 8, 8);

      // Dome window glint
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 5, y - 12, 10, 3);
    };

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const w = canvas.width;
      const h = canvas.height;
      const rowH = h / 3;

      ctx.fillStyle = bgPreset.bgHex;
      ctx.fillRect(0, 0, w, h);

      // Vertical reference lines for tracking eye motion
      ctx.strokeStyle = bgPreset.barHex;
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      // Row dividers & moving sprites
      for (let r = 0; r < 3; r++) {
        const speed = ghostSpeedPx * rowMultipliers[r];
        if (ghostRunning) {
          offsets[r] = (offsets[r] + speed * dt) % ghostSpacing;
        }
        const centerY = r * rowH + rowH / 2 + 4;

        if (r > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.16)';
          ctx.beginPath();
          ctx.moveTo(0, r * rowH);
          ctx.lineTo(w, r * rowH);
          ctx.stroke();
        }

        for (let sx = offsets[r] - ghostSpacing; sx < w + ghostSpacing; sx += ghostSpacing) {
          drawUfoSprite(sx, centerY, r);
        }

        // Row speed badge
        ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.fillRect(10, r * rowH + 8, 126, 22);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px monospace';
        ctx.fillText(`${Math.round(speed)} px/s (${rowMultipliers[r]}x)`, 16, r * rowH + 23);
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [tab, ghostRunning, ghostSpeedPx, ghostBgId, ghostSpacing]);

  const snappedHz = snapStandardRefreshRate(metrics.hz);
  const screenW = typeof window !== 'undefined' ? window.screen.width : 1920;
  const screenH = typeof window !== 'undefined' ? window.screen.height : 1080;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const flashHex = ['#ff0000', '#00ff00', '#0000ff'][flashColorIdx];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_monitor_tester_title', 'Monitor, Dead-Pixel & Ghosting Test')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'mon_subtitle',
              'Inspect dead/stuck pixels fullscreen, test LCD/OLED motion ghosting & overdrive overshoot, verify color banding, and measure live refresh rate.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          {(
            [
              { id: 'deadpixel' as MonitorTab, label: t('mon_tab_pixel', 'Dead Pixels'), icon: <Eye className="w-3.5 h-3.5" /> },
              { id: 'ghosting' as MonitorTab, label: t('mon_tab_ghosting', 'UFO Ghosting'), icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'patterns' as MonitorTab, label: t('mon_tab_patterns', 'Banding & Gamma'), icon: <Grid className="w-3.5 h-3.5" /> },
              { id: 'refresh' as MonitorTab, label: t('mon_tab_refresh', 'Refresh & Pacing'), icon: <Gauge className="w-3.5 h-3.5" /> },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Display Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('mon_refresh_rate', 'Detected Refresh Rate')}</span>
          <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
            {metrics.hz > 0 ? `${metrics.hz.toFixed(1)} Hz` : '—'}
          </span>
          {snappedHz > 0 && (
            <span className="text-[10px] font-mono text-slate-400 block">
              ~{snappedHz} Hz nominal
            </span>
          )}
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('mon_frame_time', 'Frame Time / Jitter')}</span>
          <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">
            {metrics.avgFrameMs > 0 ? `${metrics.avgFrameMs.toFixed(2)} ms` : '—'}
          </span>
          <span className="text-[10px] font-mono text-slate-400 block">
            ±{metrics.jitterMs.toFixed(2)} ms
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('mon_resolution', 'Display Resolution')}</span>
          <span className="text-2xl font-mono font-bold text-white tabular-nums">
            {screenW}×{screenH}
          </span>
          <span className="text-[10px] font-mono text-slate-400 block">
            DPR {dpr.toFixed(2)}× ({Math.round(screenW * dpr)}×{Math.round(screenH * dpr)} px)
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('mon_dropped_frames', 'Dropped Frames')}</span>
          <span
            className={`text-2xl font-mono font-bold tabular-nums ${
              metrics.droppedFrames > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {metrics.droppedFrames}
          </span>
          <span className="text-[10px] font-mono text-slate-400 block">
            {metrics.sampleCount} {t('mon_samples', 'frames sampled')}
          </span>
        </div>
      </div>

      {/* TAB 1: DEAD / STUCK PIXEL INSPECTOR */}
      {tab === 'deadpixel' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('mon_pixel_title', 'Solid-Color Dead & Stuck Pixel Inspector')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t(
                    'mon_pixel_hint',
                    'Launch fullscreen and click or press Arrow Keys / Space to cycle pure RGB, white, black, and uniformity gray screens.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={openFullscreenInspector}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                <span>{t('mon_launch_fullscreen', 'Launch Fullscreen Test')}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {PIXEL_TEST_COLORS.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorIdx(idx)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    colorIdx === idx
                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-slate-950'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                  }`}
                >
                  <div
                    className="h-10 rounded-lg border border-white/15 mb-1.5"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="text-[11px] font-medium text-slate-200 truncate">{c.id.toUpperCase()}</div>
                </button>
              ))}
            </div>

            {/* Preview Surface */}
            <div
              onClick={() => setColorIdx(prev => (prev + 1) % PIXEL_TEST_COLORS.length)}
              className="relative h-56 rounded-2xl border border-slate-700 cursor-pointer flex items-center justify-center select-none transition-colors"
              style={{ backgroundColor: activeColor.hex }}
            >
              <div
                className={`px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-sm ${
                  activeColor.darkText
                    ? 'bg-black/20 text-slate-950'
                    : 'bg-black/55 text-white'
                }`}
              >
                {activeColor.name} · {t('mon_click_cycle', 'Click to cycle color')}
              </div>

              {flasherActive && (
                <div
                  className="absolute right-4 bottom-4 w-24 h-24 rounded-lg border-2 border-white shadow-xl flex items-center justify-center"
                  style={{ backgroundColor: flashHex }}
                >
                  <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
                    RGB PULSE
                  </span>
                </div>
              )}
            </div>

            {/* Opt-in Stuck Pixel Stimulator */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 max-w-2xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-amber-300">
                    {t('mon_flasher_title', 'Stuck Pixel RGB Pulse Patch (Photosensitivity Notice):')}
                  </span>{' '}
                  {t(
                    'mon_flasher_desc',
                    'Rapidly alternates Red/Green/Blue inside a small patch to exercise stuck LCD subpixels. Do not enable if sensitive to flashing lights.'
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFlasherActive(prev => !prev)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  flasherActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {flasherActive
                  ? t('mon_flasher_stop', 'Stop Pulse Patch')
                  : t('mon_flasher_start', 'Enable Pulse Patch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UFO MOTION GHOSTING & OVERDRIVE TEST */}
      {tab === 'ghosting' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('mon_ghost_title', 'Motion Blur, Ghosting & Overdrive Overshoot Track')}
              </h3>
              <p className="text-xs text-slate-400">
                {t(
                  'mon_ghost_hint',
                  'Track the moving high-contrast sprites with your eyes. Dark trailing = slow pixel transition; bright halo = aggressive overdrive overshoot.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGhostRunning(prev => !prev)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {ghostRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{ghostRunning ? t('game_pause', 'Pause') : t('game_resume', 'Resume')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t('mon_ghost_speed', 'Base Speed')}</span>
                <span className="font-mono text-white">{ghostSpeedPx} px/s</span>
              </div>
              <input
                type="range"
                min={160}
                max={1200}
                step={40}
                value={ghostSpeedPx}
                onChange={e => setGhostSpeedPx(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t('mon_ghost_spacing', 'Sprite Spacing')}</span>
                <span className="font-mono text-white">{ghostSpacing} px</span>
              </div>
              <input
                type="range"
                min={100}
                max={320}
                step={20}
                value={ghostSpacing}
                onChange={e => setGhostSpacing(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="text-xs text-slate-400 block">{t('mon_ghost_bg', 'Transition Surface')}</span>
              <div className="flex flex-wrap gap-1">
                {GHOSTING_BACKGROUNDS.map(bg => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setGhostBgId(bg.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      ghostBgId === bg.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800 od-fixed-dark-stage">
            <canvas
              ref={ghostCanvasRef}
              width={920}
              height={300}
              className="w-full h-[300px] block"
            />
          </div>
        </div>
      )}

      {/* TAB 3: COLOR BANDING, CONTRAST, GAMMA & CHROMA 4:4:4 */}
      {tab === 'patterns' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'gradient' as PatternKind, label: t('mon_pat_gradient', 'RGB & Grayscale Banding') },
                  { id: 'contrast' as PatternKind, label: t('mon_pat_contrast', 'Black Crush & White Clip') },
                  { id: 'sharpness' as PatternKind, label: t('mon_pat_sharpness', 'Sharpness & 4:4:4 Chroma') },
                  { id: 'uniformity' as PatternKind, label: t('mon_pat_uniformity', 'Grid & Uniformity') },
                ] as const
              ).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPattern(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    pattern === p.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {pattern === 'gradient' && (
            <div className="space-y-3 od-fixed-dark-stage p-4 rounded-xl border border-slate-800">
              {[
                { label: 'Grayscale (0 → 255)', grad: 'linear-gradient(90deg, #000000, #ffffff)' },
                { label: 'Red Channel', grad: 'linear-gradient(90deg, #000000, #ff0000)' },
                { label: 'Green Channel', grad: 'linear-gradient(90deg, #000000, #00ff00)' },
                { label: 'Blue Channel', grad: 'linear-gradient(90deg, #000000, #0000ff)' },
                { label: 'Full Spectrum', grad: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' },
              ].map(bar => (
                <div key={bar.label} className="space-y-1">
                  <div className="text-[11px] font-mono text-slate-300">{bar.label}</div>
                  <div className="h-10 rounded-lg border border-white/10" style={{ background: bar.grad }} />
                </div>
              ))}
            </div>
          )}

          {pattern === 'contrast' && (
            <div className="space-y-5 od-fixed-dark-stage p-5 rounded-xl border border-slate-800">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  {t('mon_black_levels', 'Near-Black Steps (1% – 12% on Pure Black) — Every box should be faintly distinguishable')}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 p-4 rounded-xl bg-black border border-slate-800">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(pct => {
                    const v = Math.round((pct / 100) * 255);
                    return (
                      <div
                        key={pct}
                        className="h-14 rounded flex items-end justify-center pb-1 text-[10px] font-mono text-slate-400"
                        style={{ backgroundColor: `rgb(${v},${v},${v})` }}
                      >
                        {pct}%
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  {t('mon_white_levels', 'Near-White Steps (89% – 100% on Pure White) — Check for highlight clipping')}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 p-4 rounded-xl bg-white border border-slate-300">
                  {[89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100].map(pct => {
                    const v = Math.round((pct / 100) * 255);
                    return (
                      <div
                        key={pct}
                        className="h-14 rounded flex items-end justify-center pb-1 text-[10px] font-mono text-slate-600"
                        style={{ backgroundColor: `rgb(${v},${v},${v})` }}
                      >
                        {pct}%
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {pattern === 'sharpness' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 od-fixed-dark-stage p-5 rounded-xl border border-slate-800">
              <div className="p-4 rounded-xl border border-slate-700" style={{ backgroundColor: '#0000ff' }}>
                <div className="text-xs font-mono font-bold mb-1" style={{ color: '#ff0000' }}>
                  CHROMA 4:4:4 TEST — RED ON BLUE (1px crisp edges)
                </div>
                <p className="text-xs font-mono leading-relaxed" style={{ color: '#ff0000' }}>
                  The quick brown fox jumps over the lazy dog 0123456789 !@#$%^&*()
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-700" style={{ backgroundColor: '#ff00ff' }}>
                <div className="text-xs font-mono font-bold mb-1" style={{ color: '#00ff00' }}>
                  CHROMA 4:4:4 TEST — GREEN ON MAGENTA
                </div>
                <p className="text-xs font-mono leading-relaxed" style={{ color: '#00ff00' }}>
                  If text looks blurry or fringing, display output may be 4:2:2 / 4:2:0 subsampled.
                </p>
              </div>
              <div className="md:col-span-2 p-4 rounded-xl bg-black border border-slate-800 space-y-2">
                <div className="text-xs text-slate-300 font-semibold">
                  {t('mon_sharpness_lines', 'Fine Text & Over-Sharpening Ringing Check')}
                </div>
                <div className="space-y-1 font-mono text-white">
                  <div className="text-[10px]">10px — ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div>
                  <div className="text-xs">12px — ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div>
                  <div className="text-sm">14px — ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div>
                </div>
              </div>
            </div>
          )}

          {pattern === 'uniformity' && (
            <div
              className="h-72 rounded-xl border border-slate-700 relative overflow-hidden"
              style={{
                backgroundColor: '#1f2937',
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-2 border-white/60 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REFRESH RATE & FRAME PACING GRAPH */}
      {tab === 'refresh' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                {t('mon_pacing_title', 'Live VSync Frame-Time Pacing (Last 64 Frames)')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                deltasRef.current = [];
                setFrameHistory([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('game_restart', 'Reset')}</span>
            </button>
          </div>

          <div className="h-44 p-3 rounded-xl od-fixed-dark-stage border border-slate-800 flex items-end gap-1 overflow-hidden">
            {frameHistory.map((dt, idx) => {
              const target = metrics.avgFrameMs > 0 ? metrics.avgFrameMs : 16.67;
              const ratio = Math.min(2.5, dt / Math.max(4, target));
              const heightPct = Math.max(12, Math.min(100, Math.round((ratio / 2.2) * 100)));
              const spike = dt > target * 1.45;
              return (
                <div
                  key={idx}
                  title={`${dt.toFixed(2)} ms`}
                  className={`flex-1 rounded-t transition-all ${
                    spike ? 'bg-rose-500' : 'bg-emerald-500/80'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block">{t('mon_min_frame', 'Min Frame')}</span>
              <span className="text-base font-bold text-white">{metrics.minFrameMs.toFixed(2)} ms</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block">{t('mon_avg_frame', 'Avg Frame')}</span>
              <span className="text-base font-bold text-indigo-400">{metrics.avgFrameMs.toFixed(2)} ms</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block">{t('mon_max_frame', 'Max Frame Spike')}</span>
              <span className="text-base font-bold text-amber-400">{metrics.maxFrameMs.toFixed(2)} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN DEAD-PIXEL OVERLAY */}
      {fullscreenOpen && (
        <div
          ref={fullscreenRef}
          onClick={() => setColorIdx(prev => (prev + 1) % PIXEL_TEST_COLORS.length)}
          className="fixed inset-0 z-[100] cursor-pointer select-none"
          style={{ backgroundColor: activeColor.hex }}
        >
          {showOverlayHud && (
            <div
              onClick={e => e.stopPropagation()}
              className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700 text-white shadow-2xl flex flex-wrap items-center gap-3 text-xs backdrop-blur-md"
            >
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">{activeColor.name}</span>
              <span className="text-slate-400">
                {t('mon_fs_hint', 'Click / Space = Next · H = Hide Bar · ESC = Exit')}
              </span>
              <button
                type="button"
                onClick={exitFullscreenInspector}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold inline-flex items-center gap-1"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{t('mon_exit_fs', 'Exit')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
