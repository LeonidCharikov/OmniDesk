import React, { useState } from 'react';
import { Dices, RotateCw, Coins, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const WHEEL_COLORS = [
  '#4f46e5',
  '#059669',
  '#d97706',
  '#db2777',
  '#0284c7',
  '#7c3aed',
  '#dc2626',
  '#0d9488',
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export const RandomPickerTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<'wheel' | 'dice' | 'coin'>('wheel');

  // Wheel / Picker
  const [rawList, setRawList] = useState(() =>
    [
      t('rp_opt_pizza', 'Pizza'),
      t('rp_opt_sushi', 'Sushi'),
      t('rp_opt_burgers', 'Burgers'),
      t('rp_opt_pasta', 'Pasta'),
      t('rp_opt_salad', 'Salad'),
      t('rp_opt_tacos', 'Tacos'),
    ].join('\n')
  );
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [removeWinner, setRemoveWinner] = useState(false);

  // Dice
  const [diceSides, setDiceSides] = useState(6);
  const [diceCount, setDiceCount] = useState(2);
  const [diceRolls, setDiceRolls] = useState<number[]>([4, 6]);

  // Coin
  const [coinResult, setCoinResult] = useState<'heads' | 'tails'>('heads');
  const [coinStats, setCoinStats] = useState({ heads: 0, tails: 0 });

  const options = rawList
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const spinWheel = () => {
    if (options.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    const chosenIdx = Math.floor(Math.random() * options.length);
    const chosenName = options[chosenIdx];
    const segAngle = 360 / options.length;
    const centerOfSeg = chosenIdx * segAngle + segAngle / 2;
    const targetMod = (360 - centerOfSeg) % 360;
    const currentMod = rotation % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const nextRotation = rotation + 1440 + delta;

    setRotation(nextRotation);

    window.setTimeout(() => {
      setIsSpinning(false);
      setWinner(chosenName);
      if (removeWinner && options.length > 1) {
        const remaining = options.filter((_, idx) => idx !== chosenIdx);
        setRawList(remaining.join('\n'));
      }
    }, 2600);
  };

  const rollDice = () => {
    const rolls: number[] = [];
    for (let i = 0; i < diceCount; i++) {
      rolls.push(Math.floor(Math.random() * diceSides) + 1);
    }
    setDiceRolls(rolls);
  };

  const flipCoin = () => {
    const res = Math.random() < 0.5 ? 'heads' : 'tails';
    setCoinResult(res);
    setCoinStats(prev => ({ ...prev, [res]: prev[res] + 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Dices className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('rp_title', 'Random Picker, Decision Wheel & Dice')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('rp_subtitle', 'Spin a decision wheel, pick random winners from a list, roll dice, or flip a coin.')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {([
              { id: 'wheel', label: t('rp_tab_wheel', 'Decision Wheel') },
              { id: 'dice', label: t('rp_tab_dice', 'Dice Roller') },
              { id: 'coin', label: t('rp_tab_coin', 'Coin Flip') },
            ] as const).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'wheel' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-3">
              <label className="block text-xs text-slate-400">
                {t('rp_options_label', 'Options (one per line)')} ({options.length})
              </label>
              <textarea
                rows={8}
                value={rawList}
                onChange={e => setRawList(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeWinner}
                  onChange={e => setRemoveWinner(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                <span>{t('rp_remove_winner', 'Remove selected winner from list')}</span>
              </label>
            </div>

            <div className="lg:col-span-7 flex flex-col items-center space-y-4">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                {/* Pointer */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-white drop-shadow" />

                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 2.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                  }}
                >
                  {options.length === 0 ? (
                    <circle cx="100" cy="100" r="95" fill="#1e293b" />
                  ) : options.length === 1 ? (
                    <g>
                      <circle cx="100" cy="100" r="95" fill={WHEEL_COLORS[0]} />
                      <text x="100" y="104" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                        {options[0].slice(0, 14)}
                      </text>
                    </g>
                  ) : (
                    options.map((opt, i) => {
                      const seg = 360 / options.length;
                      const start = i * seg;
                      const end = start + seg;
                      const mid = start + seg / 2;
                      const textPos = polarToCartesian(100, 100, 62, mid);
                      return (
                        <g key={`${opt}-${i}`}>
                          <path
                            d={slicePath(100, 100, 95, start, end)}
                            fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                          />
                          <text
                            x={textPos.x}
                            y={textPos.y}
                            fill="#ffffff"
                            fontSize={options.length > 10 ? '7' : '9'}
                            fontWeight="600"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${mid - 90}, ${textPos.x}, ${textPos.y})`}
                          >
                            {opt.slice(0, 12)}
                          </text>
                        </g>
                      );
                    })
                  )}
                  <circle cx="100" cy="100" r="10" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                </svg>
              </div>

              <button
                type="button"
                disabled={options.length === 0 || isSpinning}
                onClick={spinWheel}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{t('rp_spin_btn', 'Spin Wheel')}</span>
              </button>

              {winner && (
                <div className="px-5 py-3 rounded-xl bg-emerald-950/50 border border-emerald-700/50 text-center">
                  <div className="text-xs text-emerald-300">{t('rp_winner_label', 'Selected Result')}</div>
                  <div className="text-xl font-bold text-white mt-0.5">{winner}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'dice' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('rp_dice_type', 'Die Type')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                    <button
                      key={sides}
                      type="button"
                      onClick={() => setDiceSides(sides)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                        diceSides === sides
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      d{sides}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('rp_dice_count', 'Number of Dice')}</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={diceCount}
                  onChange={e => setDiceCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>

              <div className="self-end">
                <button
                  type="button"
                  onClick={rollDice}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Dices className="w-4 h-4" />
                  <span>{t('rp_roll_btn', 'Roll Dice')}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {diceRolls.map((val, idx) => (
                <div
                  key={idx}
                  className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl font-bold font-mono tabular-nums text-white"
                >
                  {val}
                </div>
              ))}
            </div>

            <div className="text-sm text-slate-300 font-mono tabular-nums">
              {t('rp_dice_total', 'Total')}:{' '}
              <span className="text-xl font-bold text-emerald-400">
                {diceRolls.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
        )}

        {tab === 'coin' && (
          <div className="flex flex-col items-center py-6 space-y-5">
            <div className="w-32 h-32 rounded-full bg-slate-950 border-2 border-amber-500/60 flex flex-col items-center justify-center shadow-lg">
              <Coins className="w-8 h-8 text-amber-400 mb-1" />
              <span className="text-base font-bold text-white">
                {coinResult === 'heads' ? t('rp_heads', 'Heads') : t('rp_tails', 'Tails')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={flipCoin}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
              >
                {t('rp_flip_btn', 'Flip Coin')}
              </button>
              <button
                type="button"
                onClick={() => setCoinStats({ heads: 0, tails: 0 })}
                aria-label={t('reset', 'Reset')}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-mono tabular-nums text-slate-400 flex items-center gap-4">
              <span>{t('rp_heads', 'Heads')}: <strong className="text-white">{coinStats.heads}</strong></span>
              <span>·</span>
              <span>{t('rp_tails', 'Tails')}: <strong className="text-white">{coinStats.tails}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
