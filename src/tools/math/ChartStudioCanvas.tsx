import React, { useMemo, useState } from 'react';
import {
  ChartConfig,
  ChartDataset,
  computeBoxPlotStats,
  computeHistogramBins,
  computeLinearRegression,
  computeNiceAxisTicks,
  computeSquarifiedTreemap,
  formatCompactNumber,
  getPaletteColors,
  parseNumericCell,
} from './chartStudio.logic';

interface ChartStudioCanvasProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  dataset: ChartDataset;
  config: ChartConfig;
  emptyMessage: string;
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  lines: string[];
  color?: string;
}

const SVG_W = 880;
const SVG_H = 470;

function truncateLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(1, maxLen - 1))}…`;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildSteppedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const midX = (points[i - 1].x + points[i].x) / 2;
    d += ` L ${midX.toFixed(1)} ${points[i - 1].y.toFixed(1)} L ${midX.toFixed(1)} ${points[i].y.toFixed(1)} L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArcSlice(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = Math.min(endAngle - startAngle, Math.PI * 1.9999);
  const actualEnd = startAngle + sweep;
  const largeArc = sweep > Math.PI ? 1 : 0;

  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, actualEnd);

  if (rInner <= 0.5) {
    return [
      `M ${cx.toFixed(2)} ${cy.toFixed(2)}`,
      `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  const p3 = polarToCartesian(cx, cy, rInner, actualEnd);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function interpolateHeatmapColor(ratio: number, isDark: boolean): string {
  const t = Math.max(0, Math.min(1, ratio));
  // Smooth sequential indigo -> cyan -> emerald -> amber -> rose ramp
  const stops = isDark
    ? [
        [30, 41, 59],
        [49, 46, 129],
        [14, 116, 144],
        [16, 185, 129],
        [245, 158, 11],
        [225, 29, 72],
      ]
    : [
        [241, 245, 249],
        [199, 210, 254],
        [103, 232, 249],
        [52, 211, 153],
        [251, 191, 36],
        [225, 29, 72],
      ];
  const scaled = t * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const c0 = stops[idx];
  const c1 = stops[idx + 1];
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * frac);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * frac);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * frac);
  return `rgb(${r}, ${g}, ${b})`;
}

export const ChartStudioCanvas: React.FC<ChartStudioCanvasProps> = ({
  svgRef,
  dataset,
  config,
  emptyMessage,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const colors = useMemo(() => getPaletteColors(config.palette), [config.palette]);
  const isLight = config.canvasTheme === 'light';
  const bgFill =
    config.canvasTheme === 'light'
      ? '#ffffff'
      : config.canvasTheme === 'dark'
        ? '#0b1120'
        : 'none';

  const inkPrimary = isLight ? '#0f172a' : '#f8fafc';
  const inkSecondary = isLight ? '#475569' : '#94a3b8';
  const gridStroke = isLight ? '#e2e8f0' : '#1e293b';
  const axisStroke = isLight ? '#94a3b8' : '#334155';
  const surfaceStroke = isLight ? '#ffffff' : '#0b1120';

  const categories = useMemo(
    () => dataset.rows.map((r, idx) => r[0]?.trim() || `#${idx + 1}`),
    [dataset.rows]
  );

  const seriesNames = useMemo(
    () =>
      dataset.headers.length > 1
        ? dataset.headers.slice(1).map((h, i) => h.trim() || `Series ${i + 1}`)
        : ['Series 1'],
    [dataset.headers]
  );

  const seriesData = useMemo(() => {
    const count = Math.max(1, dataset.headers.length - 1);
    return Array.from({ length: count }, (_, sIdx) =>
      dataset.rows.map(row => {
        const v = parseNumericCell(row[sIdx + 1]);
        return Number.isFinite(v) ? v : 0;
      })
    );
  }, [dataset.headers.length, dataset.rows]);

  const hasData = dataset.rows.length > 0 && seriesData.length > 0;

  const titleOffset = config.title.trim() ? (config.subtitle.trim() ? 58 : 42) : 16;
  const showLegendTop = config.legendPosition === 'top';
  const showLegendBottom = config.legendPosition === 'bottom';

  const legendItems = useMemo(() => {
    if (
      config.family === 'pie' ||
      config.family === 'treemap' ||
      config.family === 'polar' ||
      config.family === 'funnel'
    ) {
      return categories.slice(0, 10).map((cat, idx) => ({
        label: truncateLabel(cat, 18),
        color: colors[idx % colors.length],
      }));
    }
    if (config.family === 'waterfall') {
      return [
        { label: 'Increase (+)', color: '#10b981' },
        { label: 'Decrease (−)', color: '#f43f5e' },
        { label: 'Total', color: colors[0] },
      ];
    }
    if (config.family === 'stock') {
      return [
        { label: 'Bullish (Close ≥ Open)', color: '#10b981' },
        { label: 'Bearish (Close < Open)', color: '#f43f5e' },
      ];
    }
    if (config.family === 'histogram') {
      return config.subtype === 'histogram-pareto'
        ? [
            { label: seriesNames[0] || 'Frequency', color: colors[0] },
            { label: 'Cumulative %', color: colors[3] || '#f59e0b' },
          ]
        : [{ label: seriesNames[0] || 'Frequency', color: colors[0] }];
    }
    return seriesNames.map((name, idx) => ({
      label: truncateLabel(name, 20),
      color: colors[idx % colors.length],
    }));
  }, [categories, colors, config.family, config.subtype, seriesNames]);

  const marginTop = titleOffset + (showLegendTop ? 26 : 6);
  const marginBottom = (config.xAxisLabel.trim() ? 58 : 44) + (showLegendBottom ? 26 : 0);
  const marginLeft = config.family === 'bar' ? 118 : config.yAxisLabel.trim() ? 78 : 62;
  const marginRight =
    config.family === 'combo' || config.subtype === 'histogram-pareto' ? 60 : 28;

  const plotX = marginLeft;
  const plotY = marginTop;
  const plotW = SVG_W - marginLeft - marginRight;
  const plotH = SVG_H - marginTop - marginBottom;

  const showTip = (x: number, y: number, title: string, lines: string[], color?: string) => {
    setTooltip({ x, y, title, lines, color });
  };

  const renderLegend = () => {
    if (config.legendPosition === 'none' || legendItems.length === 0) return null;
    if (config.family === 'heatmap') return null;

    const yPos = showLegendTop ? titleOffset + 6 : SVG_H - 16;
    const itemWidth = Math.min(130, (SVG_W - 60) / Math.max(1, legendItems.length));
    const totalW = itemWidth * legendItems.length;
    const startX = (SVG_W - totalW) / 2;

    return (
      <g className="chart-legend">
        {legendItems.map((item, idx) => {
          const x = startX + idx * itemWidth;
          return (
            <g key={`${item.label}-${idx}`} transform={`translate(${x}, ${yPos})`}>
              <rect x={0} y={-8} width={10} height={10} rx={2.5} fill={item.color} />
              <text
                x={15}
                y={1}
                fill={inkSecondary}
                fontSize={11}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(item.label, 15)}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderAxisTitles = () => (
    <g>
      {config.xAxisLabel.trim() &&
        !['pie', 'radar', 'treemap', 'sunburst', 'funnel', 'polar'].includes(config.family) && (
          <text
            x={plotX + plotW / 2}
            y={plotY + plotH + 40}
            textAnchor="middle"
            fill={inkSecondary}
            fontSize={11.5}
            fontWeight={600}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {config.xAxisLabel}
          </text>
        )}
      {config.yAxisLabel.trim() &&
        !['pie', 'radar', 'treemap', 'sunburst', 'funnel', 'polar', 'bar'].includes(
          config.family
        ) && (
          <text
            x={18}
            y={plotY + plotH / 2}
            textAnchor="middle"
            fill={inkSecondary}
            fontSize={11.5}
            fontWeight={600}
            fontFamily="system-ui, -apple-system, sans-serif"
            transform={`rotate(-90, 18, ${plotY + plotH / 2})`}
          >
            {config.yAxisLabel}
          </text>
        )}
    </g>
  );

  // ─── Chart Family Renderers ────────────────────────────────────────────────

  const renderColumnOrCombo = () => {
    const isStacked =
      config.subtype === 'column-stacked' || config.subtype === 'column-stacked100';
    const is100 = config.subtype === 'column-stacked100';
    const isCombo = config.family === 'combo';
    const barSeriesCount = isCombo && seriesData.length > 1 ? seriesData.length - 1 : seriesData.length;
    const lineSeriesIdx = isCombo && seriesData.length > 1 ? seriesData.length - 1 : -1;

    let minVal = 0;
    let maxVal = 0;
    if (is100) {
      minVal = 0;
      maxVal = 100;
    } else if (isStacked) {
      for (let r = 0; r < categories.length; r++) {
        let posSum = 0;
        let negSum = 0;
        for (let s = 0; s < barSeriesCount; s++) {
          const v = seriesData[s][r] ?? 0;
          if (v >= 0) posSum += v;
          else negSum += v;
        }
        maxVal = Math.max(maxVal, posSum);
        minVal = Math.min(minVal, negSum);
      }
    } else {
      for (let s = 0; s < barSeriesCount; s++) {
        for (const v of seriesData[s]) {
          maxVal = Math.max(maxVal, v);
          minVal = Math.min(minVal, v);
        }
      }
    }

    const scaleY = is100
      ? { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] }
      : computeNiceAxisTicks(minVal, maxVal, 5);
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;
    const zeroY = yToPx(Math.max(scaleY.min, Math.min(scaleY.max, 0)));

    const groupW = plotW / Math.max(1, categories.length);
    const padRatio = 0.22;
    const usableW = groupW * (1 - padRatio);

    // Secondary Y axis for combo line
    const lineVals = lineSeriesIdx >= 0 ? seriesData[lineSeriesIdx] : [];
    const scaleY2 =
      lineSeriesIdx >= 0
        ? computeNiceAxisTicks(Math.min(0, ...lineVals), Math.max(1, ...lineVals), 5)
        : null;
    const y2ToPx = (v: number) =>
      scaleY2
        ? plotY + plotH - ((v - scaleY2.min) / (scaleY2.max - scaleY2.min || 1)) * plotH
        : plotY + plotH;

    return (
      <g>
        {/* Grid & Left Y Axis */}
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line
                  x1={plotX}
                  x2={plotX + plotW}
                  y1={y}
                  y2={y}
                  stroke={tick === 0 ? axisStroke : gridStroke}
                  strokeWidth={tick === 0 ? 1.2 : 1}
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
              )}
              <text
                x={plotX - 8}
                y={y + 4}
                textAnchor="end"
                fill={inkSecondary}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {is100 ? `${tick}%` : formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* Secondary Y Axis for Combo */}
        {scaleY2 &&
          scaleY2.ticks.map((tick, idx) => {
            const y = y2ToPx(tick);
            return (
              <text
                key={`y2-${idx}`}
                x={plotX + plotW + 8}
                y={y + 4}
                textAnchor="start"
                fill={colors[lineSeriesIdx % colors.length]}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {formatCompactNumber(tick)}
              </text>
            );
          })}

        {/* Bars */}
        {categories.map((cat, rIdx) => {
          const groupStartX = plotX + rIdx * groupW + (groupW * padRatio) / 2;
          let posAcc = 0;
          let negAcc = 0;
          const rowTotalAbs = is100
            ? seriesData.reduce((acc, s) => acc + Math.abs(s[rIdx] ?? 0), 0) || 1
            : 1;

          return (
            <g key={`${cat}-${rIdx}`}>
              {Array.from({ length: barSeriesCount }, (_, sIdx) => {
                const rawVal = seriesData[sIdx][rIdx] ?? 0;
                const val = is100 ? (Math.abs(rawVal) / rowTotalAbs) * 100 : rawVal;
                const color = colors[sIdx % colors.length];

                let x: number;
                let w: number;
                let yTop: number;
                let barH: number;

                if (isStacked) {
                  w = Math.max(4, Math.min(54, usableW * 0.78));
                  x = plotX + rIdx * groupW + (groupW - w) / 2;
                  if (val >= 0) {
                    const top = yToPx(posAcc + val);
                    const bot = yToPx(posAcc);
                    yTop = top;
                    barH = Math.max(1, bot - top);
                    posAcc += val;
                  } else {
                    const top = yToPx(negAcc);
                    const bot = yToPx(negAcc + val);
                    yTop = top;
                    barH = Math.max(1, bot - top);
                    negAcc += val;
                  }
                } else {
                  const gap = barSeriesCount > 1 ? 3 : 0;
                  w = Math.max(
                    3,
                    Math.min(44, (usableW - gap * (barSeriesCount - 1)) / barSeriesCount)
                  );
                  const totalClusterW = w * barSeriesCount + gap * (barSeriesCount - 1);
                  const clusterOffset = (usableW - totalClusterW) / 2;
                  x = groupStartX + clusterOffset + sIdx * (w + gap);
                  const valY = yToPx(val);
                  yTop = Math.min(zeroY, valY);
                  barH = Math.max(1, Math.abs(zeroY - valY));
                }

                return (
                  <g key={`b-${sIdx}`}>
                    <rect
                      x={x}
                      y={yTop}
                      width={w}
                      height={barH}
                      rx={isStacked ? 1.5 : 3}
                      fill={color}
                      fillOpacity={0.92}
                      className="cursor-pointer transition-opacity hover:opacity-100"
                      onMouseEnter={() =>
                        showTip(
                          x + w / 2,
                          yTop,
                          cat,
                          [
                            `${seriesNames[sIdx]}: ${formatCompactNumber(rawVal)}`,
                            ...(is100 ? [`Share: ${val.toFixed(1)}%`] : []),
                          ],
                          color
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {config.showDataLabels && barH > 14 && (
                      <text
                        x={x + w / 2}
                        y={isStacked ? yTop + barH / 2 + 3.5 : yTop - 5}
                        textAnchor="middle"
                        fill={isStacked ? '#ffffff' : inkSecondary}
                        fontSize={9.5}
                        fontWeight={600}
                        fontFamily="ui-monospace, monospace"
                      >
                        {is100 ? `${val.toFixed(0)}%` : formatCompactNumber(rawVal)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Category Label */}
              <text
                x={plotX + rIdx * groupW + groupW / 2}
                y={plotY + plotH + 17}
                textAnchor="middle"
                fill={inkSecondary}
                fontSize={10.5}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(cat, categories.length > 8 ? 8 : 14)}
              </text>
            </g>
          );
        })}

        {/* Combo Line Overlay */}
        {isCombo && lineSeriesIdx >= 0 && lineVals.length > 0 && (() => {
          const lineColor = colors[lineSeriesIdx % colors.length];
          const pts = lineVals.map((v, idx) => ({
            x: plotX + idx * groupW + groupW / 2,
            y: y2ToPx(v),
            val: v,
            cat: categories[idx],
          }));
          const pathD = buildSmoothPath(pts);
          return (
            <g>
              <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.8} strokeLinecap="round" />
              {pts.map((p, idx) => (
                <circle
                  key={`cl-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={4.5}
                  fill={lineColor}
                  stroke={surfaceStroke}
                  strokeWidth={1.8}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    showTip(
                      p.x,
                      p.y,
                      p.cat,
                      [`${seriesNames[lineSeriesIdx]}: ${formatCompactNumber(p.val)}`],
                      lineColor
                    )
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          );
        })()}

        {/* Axes */}
        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line
          x1={plotX}
          x2={plotX + plotW}
          y1={plotY + plotH}
          y2={plotY + plotH}
          stroke={axisStroke}
          strokeWidth={1.2}
        />
      </g>
    );
  };

  const renderHorizontalBar = () => {
    const isStacked = config.subtype === 'bar-stacked' || config.subtype === 'bar-stacked100';
    const is100 = config.subtype === 'bar-stacked100';

    let minVal = 0;
    let maxVal = 0;
    if (is100) {
      maxVal = 100;
    } else if (isStacked) {
      for (let r = 0; r < categories.length; r++) {
        let posSum = 0;
        let negSum = 0;
        for (const s of seriesData) {
          const v = s[r] ?? 0;
          if (v >= 0) posSum += v;
          else negSum += v;
        }
        maxVal = Math.max(maxVal, posSum);
        minVal = Math.min(minVal, negSum);
      }
    } else {
      for (const s of seriesData) {
        for (const v of s) {
          maxVal = Math.max(maxVal, v);
          minVal = Math.min(minVal, v);
        }
      }
    }

    const scaleX = is100
      ? { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] }
      : computeNiceAxisTicks(minVal, maxVal, 5);
    const xToPx = (v: number) =>
      plotX + ((v - scaleX.min) / (scaleX.max - scaleX.min || 1)) * plotW;
    const zeroX = xToPx(Math.max(scaleX.min, Math.min(scaleX.max, 0)));

    const groupH = plotH / Math.max(1, categories.length);
    const usableH = groupH * 0.76;

    return (
      <g>
        {scaleX.ticks.map((tick, idx) => {
          const x = xToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line
                  x1={x}
                  x2={x}
                  y1={plotY}
                  y2={plotY + plotH}
                  stroke={tick === 0 ? axisStroke : gridStroke}
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
              )}
              <text
                x={x}
                y={plotY + plotH + 17}
                textAnchor="middle"
                fill={inkSecondary}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {is100 ? `${tick}%` : formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {categories.map((cat, rIdx) => {
          const groupStartY = plotY + rIdx * groupH + (groupH - usableH) / 2;
          let posAcc = 0;
          let negAcc = 0;
          const rowTotalAbs = is100
            ? seriesData.reduce((acc, s) => acc + Math.abs(s[rIdx] ?? 0), 0) || 1
            : 1;

          return (
            <g key={`${cat}-${rIdx}`}>
              <text
                x={plotX - 10}
                y={plotY + rIdx * groupH + groupH / 2 + 4}
                textAnchor="end"
                fill={inkSecondary}
                fontSize={11}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(cat, 16)}
              </text>

              {seriesData.map((s, sIdx) => {
                const rawVal = s[rIdx] ?? 0;
                const val = is100 ? (Math.abs(rawVal) / rowTotalAbs) * 100 : rawVal;
                const color = colors[sIdx % colors.length];

                let xLeft: number;
                let barW: number;
                let yTop: number;
                let barH: number;

                if (isStacked) {
                  barH = Math.max(5, Math.min(34, usableH * 0.8));
                  yTop = plotY + rIdx * groupH + (groupH - barH) / 2;
                  if (val >= 0) {
                    xLeft = xToPx(posAcc);
                    barW = Math.max(1, xToPx(posAcc + val) - xLeft);
                    posAcc += val;
                  } else {
                    const right = xToPx(negAcc);
                    xLeft = xToPx(negAcc + val);
                    barW = Math.max(1, right - xLeft);
                    negAcc += val;
                  }
                } else {
                  const gap = seriesData.length > 1 ? 2 : 0;
                  barH = Math.max(
                    4,
                    Math.min(26, (usableH - gap * (seriesData.length - 1)) / seriesData.length)
                  );
                  const totalClusterH = barH * seriesData.length + gap * (seriesData.length - 1);
                  yTop = groupStartY + (usableH - totalClusterH) / 2 + sIdx * (barH + gap);
                  const vx = xToPx(val);
                  xLeft = Math.min(zeroX, vx);
                  barW = Math.max(1, Math.abs(vx - zeroX));
                }

                return (
                  <g key={`hb-${sIdx}`}>
                    <rect
                      x={xLeft}
                      y={yTop}
                      width={barW}
                      height={barH}
                      rx={isStacked ? 1.5 : 3}
                      fill={color}
                      fillOpacity={0.92}
                      className="cursor-pointer"
                      onMouseEnter={() =>
                        showTip(
                          xLeft + barW,
                          yTop + barH / 2,
                          cat,
                          [
                            `${seriesNames[sIdx]}: ${formatCompactNumber(rawVal)}`,
                            ...(is100 ? [`Share: ${val.toFixed(1)}%`] : []),
                          ],
                          color
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {config.showDataLabels && barW > 22 && (
                      <text
                        x={isStacked ? xLeft + barW / 2 : xLeft + barW + 5}
                        y={yTop + barH / 2 + 3.5}
                        textAnchor={isStacked ? 'middle' : 'start'}
                        fill={isStacked ? '#ffffff' : inkSecondary}
                        fontSize={9.5}
                        fontWeight={600}
                        fontFamily="ui-monospace, monospace"
                      >
                        {is100 ? `${val.toFixed(0)}%` : formatCompactNumber(rawVal)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line
          x1={plotX}
          x2={plotX + plotW}
          y1={plotY + plotH}
          y2={plotY + plotH}
          stroke={axisStroke}
          strokeWidth={1.2}
        />
      </g>
    );
  };

  const renderLineOrArea = () => {
    const isArea = config.family === 'area';
    const isStacked =
      config.subtype === 'line-stacked' ||
      config.subtype === 'area-stacked' ||
      config.subtype === 'area-stacked100';
    const is100 = config.subtype === 'area-stacked100';
    const isSmooth = config.subtype === 'line-smooth' || isArea;
    const isStepped = config.subtype === 'line-stepped';

    // Compute stacked cumulative values per series
    const cumulative: number[][] = [];
    const baseline: number[][] = [];
    for (let s = 0; s < seriesData.length; s++) {
      cumulative[s] = [];
      baseline[s] = [];
      for (let r = 0; r < categories.length; r++) {
        const raw = seriesData[s][r] ?? 0;
        const rowSum = is100
          ? seriesData.reduce((acc, ser) => acc + Math.max(0, ser[r] ?? 0), 0) || 1
          : 1;
        const val = is100 ? (Math.max(0, raw) / rowSum) * 100 : raw;
        const prevTop = isStacked && s > 0 ? cumulative[s - 1][r] : 0;
        baseline[s][r] = prevTop;
        cumulative[s][r] = isStacked ? prevTop + val : val;
      }
    }

    let minVal = 0;
    let maxVal = 0;
    if (is100) {
      maxVal = 100;
    } else {
      for (const s of cumulative) {
        for (const v of s) {
          maxVal = Math.max(maxVal, v);
          minVal = Math.min(minVal, v);
        }
      }
    }

    const scaleY = is100
      ? { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] }
      : computeNiceAxisTicks(minVal, maxVal, 5);
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;
    const xForIdx = (idx: number) =>
      categories.length <= 1
        ? plotX + plotW / 2
        : plotX + (idx / (categories.length - 1)) * plotW;

    return (
      <g>
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line
                  x1={plotX}
                  x2={plotX + plotW}
                  y1={y}
                  y2={y}
                  stroke={gridStroke}
                  strokeDasharray="3 3"
                />
              )}
              <text
                x={plotX - 8}
                y={y + 4}
                textAnchor="end"
                fill={inkSecondary}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {is100 ? `${tick}%` : formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        {isArea &&
          seriesData.map((_, sIdx) => {
            const color = colors[sIdx % colors.length];
            const topPts = categories.map((__, rIdx) => ({
              x: xForIdx(rIdx),
              y: yToPx(cumulative[sIdx][rIdx]),
            }));
            const botPts = categories
              .map((__, rIdx) => ({
                x: xForIdx(rIdx),
                y: yToPx(isStacked ? baseline[sIdx][rIdx] : Math.max(scaleY.min, 0)),
              }))
              .reverse();
            const topPath = isSmooth
              ? buildSmoothPath(topPts)
              : topPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const closePart = botPts
              .map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={`area-${sIdx}`}
                d={`${topPath} ${closePart} Z`}
                fill={color}
                fillOpacity={isStacked ? 0.48 : 0.22}
              />
            );
          })}

        {/* Line strokes & markers */}
        {seriesData.map((s, sIdx) => {
          const color = colors[sIdx % colors.length];
          const pts = categories.map((cat, rIdx) => ({
            x: xForIdx(rIdx),
            y: yToPx(cumulative[sIdx][rIdx]),
            raw: s[rIdx] ?? 0,
            cat,
          }));
          const pathD = isStepped
            ? buildSteppedPath(pts)
            : isSmooth
              ? buildSmoothPath(pts)
              : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

          return (
            <g key={`line-${sIdx}`}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map((p, rIdx) => (
                <g key={`pt-${rIdx}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={color}
                    stroke={surfaceStroke}
                    strokeWidth={1.6}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      showTip(
                        p.x,
                        p.y,
                        p.cat,
                        [`${seriesNames[sIdx]}: ${formatCompactNumber(p.raw)}`],
                        color
                      )
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {config.showDataLabels && (
                    <text
                      x={p.x}
                      y={p.y - 9}
                      textAnchor="middle"
                      fill={inkSecondary}
                      fontSize={9.5}
                      fontFamily="ui-monospace, monospace"
                    >
                      {formatCompactNumber(p.raw)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}

        {/* X labels */}
        {categories.map((cat, idx) => (
          <text
            key={`xl-${idx}`}
            x={xForIdx(idx)}
            y={plotY + plotH + 18}
            textAnchor="middle"
            fill={inkSecondary}
            fontSize={10.5}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {truncateLabel(cat, categories.length > 9 ? 7 : 12)}
          </text>
        ))}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line
          x1={plotX}
          x2={plotX + plotW}
          y1={plotY + plotH}
          y2={plotY + plotH}
          stroke={axisStroke}
          strokeWidth={1.2}
        />
      </g>
    );
  };

  const renderPieOrDonut = () => {
    const values = seriesData[0] ?? [];
    const items = categories
      .map((label, idx) => ({
        label,
        value: Math.max(0, values[idx] ?? 0),
        color: colors[idx % colors.length],
      }))
      .filter(item => item.value > 0);
    const total = items.reduce((sum, i) => sum + i.value, 0);
    if (total <= 0) return null;

    const isSemi = config.subtype === 'pie-semi';
    const isDonut = config.subtype === 'pie-donut' || isSemi;
    const isExploded = config.subtype === 'pie-exploded';

    const cx = SVG_W / 2;
    const cy = isSemi ? plotY + plotH * 0.78 : plotY + plotH / 2;
    const rOuter = Math.min(plotW * 0.34, plotH * (isSemi ? 0.64 : 0.44));
    const rInner = isDonut ? rOuter * 0.56 : 0;

    let currentAngle = isSemi ? Math.PI : -Math.PI / 2;
    const totalSpan = isSemi ? Math.PI : Math.PI * 2;

    return (
      <g>
        {items.map((item, idx) => {
          const share = item.value / total;
          const sliceSpan = share * totalSpan;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sliceSpan;
          const midAngle = (startAngle + endAngle) / 2;
          currentAngle = endAngle;

          const offsetDist = isExploded ? 10 : 0;
          const ox = cx + Math.cos(midAngle) * offsetDist;
          const oy = cy + Math.sin(midAngle) * offsetDist;
          const pathD = describeArcSlice(ox, oy, rOuter, rInner, startAngle, endAngle);
          const labelPos = polarToCartesian(ox, oy, rOuter + 18, midAngle);
          const tipPos = polarToCartesian(ox, oy, (rOuter + rInner) / 2, midAngle);

          return (
            <g key={`${item.label}-${idx}`}>
              <path
                d={pathD}
                fill={item.color}
                stroke={surfaceStroke}
                strokeWidth={2}
                className="cursor-pointer transition-opacity hover:opacity-90"
                onMouseEnter={() =>
                  showTip(
                    tipPos.x,
                    tipPos.y,
                    item.label,
                    [
                      `${seriesNames[0]}: ${formatCompactNumber(item.value)}`,
                      `Share: ${(share * 100).toFixed(1)}%`,
                    ],
                    item.color
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {config.showDataLabels && share >= 0.045 && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 4}
                  textAnchor={Math.cos(midAngle) >= 0 ? 'start' : 'end'}
                  fill={inkPrimary}
                  fontSize={10.5}
                  fontWeight={600}
                  fontFamily="ui-monospace, monospace"
                >
                  {truncateLabel(item.label, 12)} ({(share * 100).toFixed(1)}%)
                </text>
              )}
            </g>
          );
        })}

        {isDonut && (
          <g>
            <text
              x={cx}
              y={isSemi ? cy - 26 : cy - 4}
              textAnchor="middle"
              fill={inkSecondary}
              fontSize={11}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Total
            </text>
            <text
              x={cx}
              y={isSemi ? cy - 6 : cy + 18}
              textAnchor="middle"
              fill={inkPrimary}
              fontSize={20}
              fontWeight={700}
              fontFamily="ui-monospace, monospace"
            >
              {formatCompactNumber(total)}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderScatterOrBubble = () => {
    const isBubble = config.subtype === 'scatter-bubble';
    const isTrend = config.subtype === 'scatter-trendline';

    // Col 0 = X (if numeric, else 1..N index), Col 1 = Y, Col 2 = Size (bubble) or Series 2
    const points = dataset.rows
      .map((row, idx) => {
        const parsedX = parseNumericCell(row[0]);
        const x = Number.isFinite(parsedX) ? parsedX : idx + 1;
        const y = parseNumericCell(row[1]);
        const sizeRaw = parseNumericCell(row[2]);
        const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : 20;
        return {
          x,
          y: Number.isFinite(y) ? y : 0,
          size,
          label: row[0]?.trim() || `#${idx + 1}`,
        };
      });

    if (points.length === 0) return null;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const sizes = points.map(p => p.size);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    const scaleX = computeNiceAxisTicks(Math.min(...xs), Math.max(...xs), 6);
    const scaleY = computeNiceAxisTicks(Math.min(...ys), Math.max(...ys), 5);
    const xToPx = (v: number) =>
      plotX + ((v - scaleX.min) / (scaleX.max - scaleX.min || 1)) * plotW;
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;

    const reg = isTrend ? computeLinearRegression(points) : null;

    return (
      <g>
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={`sy-${idx}`}>
              {config.showGrid && (
                <line x1={plotX} x2={plotX + plotW} y1={y} y2={y} stroke={gridStroke} strokeDasharray="3 3" />
              )}
              <text x={plotX - 8} y={y + 4} textAnchor="end" fill={inkSecondary} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}
        {scaleX.ticks.map((tick, idx) => {
          const x = xToPx(tick);
          return (
            <g key={`sx-${idx}`}>
              {config.showGrid && (
                <line x1={x} x2={x} y1={plotY} y2={plotY + plotH} stroke={gridStroke} strokeDasharray="3 3" />
              )}
              <text x={x} y={plotY + plotH + 17} textAnchor="middle" fill={inkSecondary} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* Regression Line */}
        {reg && (() => {
          const x1 = scaleX.min;
          const x2 = scaleX.max;
          const y1 = reg.slope * x1 + reg.intercept;
          const y2 = reg.slope * x2 + reg.intercept;
          const sign = reg.intercept >= 0 ? '+' : '−';
          const eq = `y = ${reg.slope.toFixed(2)}x ${sign} ${Math.abs(reg.intercept).toFixed(2)}   (R² = ${reg.r2.toFixed(3)})`;
          return (
            <g>
              <line
                x1={xToPx(x1)}
                y1={Math.max(plotY, Math.min(plotY + plotH, yToPx(y1)))}
                x2={xToPx(x2)}
                y2={Math.max(plotY, Math.min(plotY + plotH, yToPx(y2)))}
                stroke={colors[1] || '#06b6d4'}
                strokeWidth={2.2}
                strokeDasharray="6 4"
              />
              <text
                x={plotX + plotW - 8}
                y={plotY + 16}
                textAnchor="end"
                fill={colors[1] || '#06b6d4'}
                fontSize={11}
                fontWeight={600}
                fontFamily="ui-monospace, monospace"
              >
                {eq}
              </text>
            </g>
          );
        })()}

        {/* Points / Bubbles */}
        {points.map((p, idx) => {
          const px = xToPx(p.x);
          const py = yToPx(p.y);
          const radius = isBubble
            ? 7 + ((p.size - minSize) / (maxSize - minSize || 1)) * 19
            : 5.5;
          const color = colors[isBubble ? idx % colors.length : 0];
          return (
            <g key={`sc-${idx}`}>
              <circle
                cx={px}
                cy={py}
                r={radius}
                fill={color}
                fillOpacity={isBubble ? 0.58 : 0.88}
                stroke={color}
                strokeWidth={1.8}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    px,
                    py - radius,
                    `${dataset.headers[0] || 'X'}: ${formatCompactNumber(p.x)}`,
                    [
                      `${seriesNames[0] || 'Y'}: ${formatCompactNumber(p.y)}`,
                      ...(isBubble ? [`${seriesNames[1] || 'Size'}: ${formatCompactNumber(p.size)}`] : []),
                    ],
                    color
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {config.showDataLabels && (
                <text
                  x={px}
                  y={py - radius - 5}
                  textAnchor="middle"
                  fill={inkSecondary}
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  ({formatCompactNumber(p.x)}, {formatCompactNumber(p.y)})
                </text>
              )}
            </g>
          );
        })}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line x1={plotX} x2={plotX + plotW} y1={plotY + plotH} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
      </g>
    );
  };

  const renderHistogramOrPareto = () => {
    const isPareto = config.subtype === 'histogram-pareto';
    const rawValues = seriesData[0] ?? [];
    const bins = computeHistogramBins(rawValues, config.histogramBins);
    if (bins.length === 0) return null;

    const orderedBins = isPareto
      ? (() => {
          const sorted = [...bins].sort((a, b) => b.count - a.count);
          const total = sorted.reduce((acc, b) => acc + b.count, 0) || 1;
          let acc = 0;
          return sorted.map(b => {
            acc += b.count;
            return { ...b, cumulativePercent: Math.round((acc / total) * 1000) / 10 };
          });
        })()
      : bins;

    const maxCount = Math.max(1, ...orderedBins.map(b => b.count));
    const scaleY = computeNiceAxisTicks(0, maxCount, 5);
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;
    const pctToPx = (pct: number) => plotY + plotH - (pct / 100) * plotH;

    const barSlot = plotW / orderedBins.length;
    const barGap = isPareto ? 8 : 2;
    const barW = Math.max(6, barSlot - barGap);
    const primaryColor = colors[0];
    const lineColor = colors[3] || '#f59e0b';

    const paretoPts = orderedBins.map((b, idx) => ({
      x: plotX + idx * barSlot + barSlot / 2,
      y: pctToPx(b.cumulativePercent),
      bin: b,
    }));

    return (
      <g>
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line x1={plotX} x2={plotX + plotW} y1={y} y2={y} stroke={gridStroke} strokeDasharray="3 3" />
              )}
              <text x={plotX - 8} y={y + 4} textAnchor="end" fill={inkSecondary} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {isPareto &&
          [0, 20, 40, 60, 80, 100].map(pct => (
            <text
              key={`p-${pct}`}
              x={plotX + plotW + 8}
              y={pctToPx(pct) + 4}
              textAnchor="start"
              fill={lineColor}
              fontSize={10}
              fontFamily="ui-monospace, monospace"
            >
              {pct}%
            </text>
          ))}

        {orderedBins.map((bin, idx) => {
          const x = plotX + idx * barSlot + barGap / 2;
          const y = yToPx(bin.count);
          const h = Math.max(1, plotY + plotH - y);
          return (
            <g key={`bin-${idx}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2.5}
                fill={primaryColor}
                fillOpacity={0.86}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    x + barW / 2,
                    y,
                    `Bin: ${bin.label}`,
                    [`Count: ${bin.count}`, `Cumulative: ${bin.cumulativePercent}%`],
                    primaryColor
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {config.showDataLabels && bin.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fill={inkSecondary}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="ui-monospace, monospace"
                >
                  {bin.count}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={plotY + plotH + 17}
                textAnchor="middle"
                fill={inkSecondary}
                fontSize={9.5}
                fontFamily="ui-monospace, monospace"
              >
                {truncateLabel(bin.label, 11)}
              </text>
            </g>
          );
        })}

        {isPareto && paretoPts.length > 0 && (
          <g>
            <path
              d={paretoPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.5}
            />
            {paretoPts.map((p, idx) => (
              <circle
                key={`pp-${idx}`}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={lineColor}
                stroke={surfaceStroke}
                strokeWidth={1.5}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    p.x,
                    p.y,
                    `Bin: ${p.bin.label}`,
                    [`Cumulative: ${p.bin.cumulativePercent}%`],
                    lineColor
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </g>
        )}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line x1={plotX} x2={plotX + plotW} y1={plotY + plotH} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
      </g>
    );
  };

  const renderBoxPlot = () => {
    const showPoints = config.subtype === 'boxplot-points';
    const boxStats = seriesData
      .map((vals, idx) => ({
        name: seriesNames[idx],
        color: colors[idx % colors.length],
        stats: computeBoxPlotStats(vals),
      }))
      .filter((entry): entry is { name: string; color: string; stats: NonNullable<ReturnType<typeof computeBoxPlotStats>> } => Boolean(entry.stats));

    if (boxStats.length === 0) return null;

    const allMin = Math.min(...boxStats.map(b => b.stats.min));
    const allMax = Math.max(...boxStats.map(b => b.stats.max));
    const scaleY = computeNiceAxisTicks(allMin, allMax, 5);
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;

    const slotW = plotW / boxStats.length;
    const boxW = Math.min(72, slotW * 0.44);

    return (
      <g>
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line x1={plotX} x2={plotX + plotW} y1={y} y2={y} stroke={gridStroke} strokeDasharray="3 3" />
              )}
              <text x={plotX - 8} y={y + 4} textAnchor="end" fill={inkSecondary} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {boxStats.map(({ name, color, stats }, idx) => {
          const cx = plotX + idx * slotW + slotW / 2;
          const yLow = yToPx(stats.whiskerLow);
          const yQ1 = yToPx(stats.q1);
          const yMed = yToPx(stats.median);
          const yMean = yToPx(stats.mean);
          const yQ3 = yToPx(stats.q3);
          const yHigh = yToPx(stats.whiskerHigh);

          return (
            <g
              key={`${name}-${idx}`}
              className="cursor-pointer"
              onMouseEnter={() =>
                showTip(
                  cx,
                  yQ3,
                  name,
                  [
                    `Max: ${formatCompactNumber(stats.max)} · Q3: ${formatCompactNumber(stats.q3)}`,
                    `Median: ${formatCompactNumber(stats.median)} · Mean: ${formatCompactNumber(stats.mean)}`,
                    `Q1: ${formatCompactNumber(stats.q1)} · Min: ${formatCompactNumber(stats.min)}`,
                    ...(stats.outliers.length > 0 ? [`Outliers: ${stats.outliers.map(formatCompactNumber).join(', ')}`] : []),
                  ],
                  color
                )
              }
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Whiskers */}
              <line x1={cx} x2={cx} y1={yHigh} y2={yQ3} stroke={color} strokeWidth={2} />
              <line x1={cx} x2={cx} y1={yQ1} y2={yLow} stroke={color} strokeWidth={2} />
              <line x1={cx - boxW * 0.35} x2={cx + boxW * 0.35} y1={yHigh} y2={yHigh} stroke={color} strokeWidth={2} />
              <line x1={cx - boxW * 0.35} x2={cx + boxW * 0.35} y1={yLow} y2={yLow} stroke={color} strokeWidth={2} />

              {/* IQR Box */}
              <rect
                x={cx - boxW / 2}
                y={yQ3}
                width={boxW}
                height={Math.max(2, yQ1 - yQ3)}
                rx={3}
                fill={color}
                fillOpacity={0.28}
                stroke={color}
                strokeWidth={2}
              />

              {/* Median Line */}
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={yMed} y2={yMed} stroke={inkPrimary} strokeWidth={2.5} />

              {/* Mean Diamond */}
              <polygon
                points={`${cx},${yMean - 5} ${cx + 5},${yMean} ${cx},${yMean + 5} ${cx - 5},${yMean}`}
                fill={color}
                stroke={surfaceStroke}
                strokeWidth={1.2}
              />

              {/* Outliers */}
              {stats.outliers.map((out, oIdx) => (
                <circle
                  key={`o-${oIdx}`}
                  cx={cx}
                  cy={yToPx(out)}
                  r={4}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={2}
                />
              ))}

              {/* Jittered Data Points */}
              {showPoints &&
                stats.values.map((val, vIdx) => {
                  const jitter = ((vIdx % 5) - 2) * (boxW * 0.14);
                  return (
                    <circle
                      key={`jp-${vIdx}`}
                      cx={cx + jitter}
                      cy={yToPx(val)}
                      r={2.8}
                      fill={color}
                      fillOpacity={0.75}
                    />
                  );
                })}

              {config.showDataLabels && (
                <text
                  x={cx + boxW / 2 + 6}
                  y={yMed + 3.5}
                  textAnchor="start"
                  fill={inkSecondary}
                  fontSize={9.5}
                  fontFamily="ui-monospace, monospace"
                >
                  {formatCompactNumber(stats.median)}
                </text>
              )}

              <text
                x={cx}
                y={plotY + plotH + 18}
                textAnchor="middle"
                fill={inkSecondary}
                fontSize={11}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(name, 16)}
              </text>
            </g>
          );
        })}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line x1={plotX} x2={plotX + plotW} y1={plotY + plotH} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
      </g>
    );
  };

  const renderWaterfall = () => {
    const vals = seriesData[0] ?? [];
    if (vals.length === 0) return null;

    interface WfBar {
      label: string;
      start: number;
      end: number;
      delta: number;
      isTotal: boolean;
    }

    const bars: WfBar[] = [];
    let running = 0;
    for (let i = 0; i < categories.length; i++) {
      const d = vals[i] ?? 0;
      bars.push({ label: categories[i], start: running, end: running + d, delta: d, isTotal: false });
      running += d;
    }
    bars.push({ label: 'Total', start: 0, end: running, delta: running, isTotal: true });

    const allNums = bars.flatMap(b => [b.start, b.end, 0]);
    const scaleY = computeNiceAxisTicks(Math.min(...allNums), Math.max(...allNums), 5);
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;

    const slotW = plotW / bars.length;
    const barW = Math.min(54, slotW * 0.62);

    return (
      <g>
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line
                  x1={plotX}
                  x2={plotX + plotW}
                  y1={y}
                  y2={y}
                  stroke={tick === 0 ? axisStroke : gridStroke}
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
              )}
              <text x={plotX - 8} y={y + 4} textAnchor="end" fill={inkSecondary} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {bars.map((b, idx) => {
          const x = plotX + idx * slotW + (slotW - barW) / 2;
          const y1 = yToPx(b.start);
          const y2 = yToPx(b.end);
          const yTop = Math.min(y1, y2);
          const h = Math.max(2, Math.abs(y2 - y1));
          const fill = b.isTotal ? colors[0] : b.delta >= 0 ? '#10b981' : '#f43f5e';

          const nextBar = bars[idx + 1];
          const connectorY = yToPx(b.end);

          return (
            <g key={`${b.label}-${idx}`}>
              {nextBar && (
                <line
                  x1={x + barW}
                  x2={plotX + (idx + 1) * slotW + (slotW - barW) / 2}
                  y1={connectorY}
                  y2={connectorY}
                  stroke={axisStroke}
                  strokeDasharray="3 3"
                  strokeWidth={1.1}
                />
              )}
              <rect
                x={x}
                y={yTop}
                width={barW}
                height={h}
                rx={3}
                fill={fill}
                fillOpacity={0.92}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    x + barW / 2,
                    yTop,
                    b.label,
                    [
                      `${b.isTotal ? 'Net Total' : 'Delta'}: ${b.delta >= 0 && !b.isTotal ? '+' : ''}${formatCompactNumber(b.delta)}`,
                      ...(!b.isTotal ? [`Running Total: ${formatCompactNumber(b.end)}`] : []),
                    ],
                    fill
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {config.showDataLabels && (
                <text
                  x={x + barW / 2}
                  y={yTop - 6}
                  textAnchor="middle"
                  fill={inkPrimary}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="ui-monospace, monospace"
                >
                  {b.delta >= 0 && !b.isTotal ? `+${formatCompactNumber(b.delta)}` : formatCompactNumber(b.delta)}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={plotY + plotH + 17}
                textAnchor="middle"
                fill={b.isTotal ? inkPrimary : inkSecondary}
                fontSize={10}
                fontWeight={b.isTotal ? 700 : 400}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(b.label, 11)}
              </text>
            </g>
          );
        })}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line x1={plotX} x2={plotX + plotW} y1={plotY + plotH} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
      </g>
    );
  };

  const renderFunnel = () => {
    const vals = seriesData[0] ?? [];
    const stages = categories.map((label, idx) => ({
      label,
      value: Math.max(0, vals[idx] ?? 0),
      color: colors[idx % colors.length],
    }));
    const maxVal = Math.max(1, ...stages.map(s => s.value));
    const firstVal = stages[0]?.value || 1;
    const stageH = plotH / Math.max(1, stages.length);
    const maxW = plotW * 0.72;
    const cx = SVG_W / 2;

    return (
      <g>
        {stages.map((stage, idx) => {
          const topW = Math.max(44, (stage.value / maxVal) * maxW);
          const nextStage = stages[idx + 1];
          const botW = nextStage
            ? Math.max(36, (nextStage.value / maxVal) * maxW)
            : topW * 0.82;
          const y1 = plotY + idx * stageH + 3;
          const y2 = plotY + (idx + 1) * stageH - 3;
          const points = [
            `${(cx - topW / 2).toFixed(1)},${y1.toFixed(1)}`,
            `${(cx + topW / 2).toFixed(1)},${y1.toFixed(1)}`,
            `${(cx + botW / 2).toFixed(1)},${y2.toFixed(1)}`,
            `${(cx - botW / 2).toFixed(1)},${y2.toFixed(1)}`,
          ].join(' ');

          const pctOfTop = (stage.value / firstVal) * 100;
          const prevVal = idx > 0 ? stages[idx - 1].value : stage.value;
          const stepRate = prevVal > 0 ? (stage.value / prevVal) * 100 : 0;

          return (
            <g key={`${stage.label}-${idx}`}>
              <polygon
                points={points}
                fill={stage.color}
                fillOpacity={0.9}
                stroke={surfaceStroke}
                strokeWidth={1.5}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    cx,
                    y1,
                    stage.label,
                    [
                      `Count: ${formatCompactNumber(stage.value)}`,
                      `Of Initial: ${pctOfTop.toFixed(1)}%`,
                      ...(idx > 0 ? [`Step Conversion: ${stepRate.toFixed(1)}%`] : []),
                    ],
                    stage.color
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
              <text
                x={cx}
                y={(y1 + y2) / 2 + 4}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={11.5}
                fontWeight={700}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(stage.label, 22)} · {formatCompactNumber(stage.value)} ({pctOfTop.toFixed(1)}%)
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderRadar = () => {
    const n = categories.length;
    if (n < 3) return null;
    const isFilled = config.subtype === 'radar-filled';

    const cx = SVG_W / 2;
    const cy = plotY + plotH / 2 + 4;
    const maxR = Math.min(plotW, plotH) * 0.42;
    const maxVal = Math.max(1, ...seriesData.flat().map(v => Math.max(0, v)));
    const rings = 5;

    return (
      <g>
        {/* Concentric polygon grid */}
        {Array.from({ length: rings }, (_, rIdx) => {
          const radius = (maxR * (rIdx + 1)) / rings;
          const polyPts = categories
            .map((__, i) => {
              const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
              const p = polarToCartesian(cx, cy, radius, angle);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={`rg-${rIdx}`}
              points={polyPts}
              fill="none"
              stroke={gridStroke}
              strokeWidth={1}
            />
          );
        })}

        {/* Spokes & axis labels */}
        {categories.map((cat, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const end = polarToCartesian(cx, cy, maxR, angle);
          const lbl = polarToCartesian(cx, cy, maxR + 18, angle);
          return (
            <g key={`sp-${i}`}>
              <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={gridStroke} strokeWidth={1} />
              <text
                x={lbl.x}
                y={lbl.y + 4}
                textAnchor={Math.abs(Math.cos(angle)) < 0.15 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'}
                fill={inkSecondary}
                fontSize={10.5}
                fontWeight={600}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {truncateLabel(cat, 14)}
              </text>
            </g>
          );
        })}

        {/* Series Polygons */}
        {seriesData.map((s, sIdx) => {
          const color = colors[sIdx % colors.length];
          const pts = categories.map((cat, i) => {
            const val = Math.max(0, s[i] ?? 0);
            const r = (val / maxVal) * maxR;
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            return { ...polarToCartesian(cx, cy, r, angle), val, cat };
          });
          const polyStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return (
            <g key={`rs-${sIdx}`}>
              <polygon
                points={polyStr}
                fill={isFilled ? color : 'none'}
                fillOpacity={isFilled ? 0.22 : 0}
                stroke={color}
                strokeWidth={2.2}
              />
              {pts.map((p, i) => (
                <circle
                  key={`rp-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={3.8}
                  fill={color}
                  stroke={surfaceStroke}
                  strokeWidth={1.4}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    showTip(
                      p.x,
                      p.y,
                      p.cat,
                      [`${seriesNames[sIdx]}: ${formatCompactNumber(p.val)}`],
                      color
                    )
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          );
        })}
      </g>
    );
  };

  const renderTreemap = () => {
    const vals = seriesData[0] ?? [];
    const inputs = categories.map((label, idx) => ({
      label,
      value: Math.max(0, vals[idx] ?? 0),
      color: colors[idx % colors.length],
    }));
    const rects = computeSquarifiedTreemap(inputs, plotW, plotH);

    return (
      <g transform={`translate(${plotX}, ${plotY})`}>
        {rects.map((rect, idx) => (
          <g
            key={`${rect.label}-${idx}`}
            className="cursor-pointer"
            onMouseEnter={() =>
              showTip(
                plotX + rect.x + rect.w / 2,
                plotY + rect.y + 12,
                rect.label,
                [
                  `${seriesNames[0]}: ${formatCompactNumber(rect.value)}`,
                  `Share: ${rect.sharePercent}%`,
                ],
                rect.color
              )
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <rect
              x={rect.x + 1.5}
              y={rect.y + 1.5}
              width={Math.max(2, rect.w - 3)}
              height={Math.max(2, rect.h - 3)}
              rx={5}
              fill={rect.color}
              fillOpacity={0.9}
              stroke={surfaceStroke}
              strokeWidth={1.5}
            />
            {rect.w > 54 && rect.h > 34 && (
              <>
                <text
                  x={rect.x + 10}
                  y={rect.y + 20}
                  fill="#ffffff"
                  fontSize={11.5}
                  fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {truncateLabel(rect.label, Math.floor(rect.w / 7.5))}
                </text>
                {rect.h > 48 && (
                  <text
                    x={rect.x + 10}
                    y={rect.y + 36}
                    fill="rgba(255,255,255,0.88)"
                    fontSize={10.5}
                    fontFamily="ui-monospace, monospace"
                  >
                    {formatCompactNumber(rect.value)} ({rect.sharePercent}%)
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </g>
    );
  };

  const renderSunburst = () => {
    const cx = SVG_W / 2;
    const cy = plotY + plotH / 2 + 2;
    const maxR = Math.min(plotW, plotH) * 0.45;
    const innerHole = maxR * 0.24;
    const ringCount = Math.min(4, seriesData.length);
    const ringThickness = (maxR - innerHole) / Math.max(1, ringCount);

    return (
      <g>
        {Array.from({ length: ringCount }, (_, sIdx) => {
          const vals = seriesData[sIdx];
          const total = vals.reduce((acc, v) => acc + Math.max(0, v), 0);
          if (total <= 0) return null;
          const r0 = innerHole + sIdx * ringThickness + 2;
          const r1 = innerHole + (sIdx + 1) * ringThickness - 2;
          let angle = -Math.PI / 2;

          return (
            <g key={`sb-ring-${sIdx}`}>
              {categories.map((cat, cIdx) => {
                const val = Math.max(0, vals[cIdx] ?? 0);
                if (val <= 0) return null;
                const share = val / total;
                const span = share * Math.PI * 2;
                const start = angle;
                const end = angle + span;
                const mid = (start + end) / 2;
                angle = end;

                const color = colors[cIdx % colors.length];
                const opacity = Math.max(0.45, 1 - sIdx * 0.16);
                const tipPos = polarToCartesian(cx, cy, (r0 + r1) / 2, mid);

                return (
                  <path
                    key={`sb-${sIdx}-${cIdx}`}
                    d={describeArcSlice(cx, cy, r1, r0, start, end)}
                    fill={color}
                    fillOpacity={opacity}
                    stroke={surfaceStroke}
                    strokeWidth={1.6}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      showTip(
                        tipPos.x,
                        tipPos.y,
                        `${seriesNames[sIdx]} · ${cat}`,
                        [
                          `Value: ${formatCompactNumber(val)}`,
                          `Ring Share: ${(share * 100).toFixed(1)}%`,
                        ],
                        color
                      )
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </g>
          );
        })}

        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={inkSecondary}
          fontSize={10.5}
          fontWeight={600}
          fontFamily="ui-monospace, monospace"
        >
          {ringCount} {ringCount === 1 ? 'ring' : 'rings'}
        </text>
      </g>
    );
  };

  const renderHeatmap = () => {
    const rowCount = categories.length;
    const colCount = seriesNames.length;
    if (rowCount === 0 || colCount === 0) return null;

    const flatVals = seriesData.flat();
    const minV = Math.min(...flatVals);
    const maxV = Math.max(...flatVals);
    const cellW = plotW / colCount;
    const cellH = (plotH - 26) / rowCount;

    return (
      <g>
        {categories.map((cat, rIdx) => (
          <text
            key={`hm-r-${rIdx}`}
            x={plotX - 8}
            y={plotY + rIdx * cellH + cellH / 2 + 4}
            textAnchor="end"
            fill={inkSecondary}
            fontSize={10.5}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {truncateLabel(cat, 10)}
          </text>
        ))}

        {seriesNames.map((colName, cIdx) => (
          <text
            key={`hm-c-${cIdx}`}
            x={plotX + cIdx * cellW + cellW / 2}
            y={plotY + rowCount * cellH + 16}
            textAnchor="middle"
            fill={inkSecondary}
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
          >
            {truncateLabel(colName, 10)}
          </text>
        ))}

        {categories.map((cat, rIdx) =>
          seriesNames.map((colName, cIdx) => {
            const val = seriesData[cIdx]?.[rIdx] ?? 0;
            const ratio = maxV === minV ? 0.5 : (val - minV) / (maxV - minV);
            const fill = interpolateHeatmapColor(ratio, !isLight);
            const x = plotX + cIdx * cellW;
            const y = plotY + rIdx * cellH;
            const textFill = ratio > 0.42 || !isLight ? '#ffffff' : '#0f172a';
            return (
              <g
                key={`hm-${rIdx}-${cIdx}`}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    x + cellW / 2,
                    y,
                    `${cat} · ${colName}`,
                    [`Value: ${formatCompactNumber(val)}`],
                    fill
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <rect
                  x={x + 1.5}
                  y={y + 1.5}
                  width={Math.max(2, cellW - 3)}
                  height={Math.max(2, cellH - 3)}
                  rx={4}
                  fill={fill}
                />
                {cellW > 32 && cellH > 18 && (
                  <text
                    x={x + cellW / 2}
                    y={y + cellH / 2 + 4}
                    textAnchor="middle"
                    fill={textFill}
                    fontSize={10.5}
                    fontWeight={600}
                    fontFamily="ui-monospace, monospace"
                  >
                    {formatCompactNumber(val)}
                  </text>
                )}
              </g>
            );
          })
        )}

        {/* Color Scale Bar */}
        {(() => {
          const barW = 160;
          const bx = plotX + plotW - barW;
          const by = plotY + plotH + 22;
          return (
            <g>
              {Array.from({ length: 24 }, (_, i) => (
                <rect
                  key={i}
                  x={bx + (i / 24) * barW}
                  y={by}
                  width={barW / 24 + 0.5}
                  height={8}
                  fill={interpolateHeatmapColor(i / 23, !isLight)}
                />
              ))}
              <text x={bx - 6} y={by + 7} textAnchor="end" fill={inkSecondary} fontSize={9.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(minV)}
              </text>
              <text x={bx + barW + 6} y={by + 7} textAnchor="start" fill={inkSecondary} fontSize={9.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(maxV)}
              </text>
            </g>
          );
        })()}
      </g>
    );
  };

  const renderStockOhlc = () => {
    const isHlc = config.subtype === 'stock-hlc';
    // Expects Open, High, Low, Close in columns 1..4 (gracefully falls back if fewer columns)
    const candles = categories.map((label, idx) => {
      const c1 = seriesData[0]?.[idx] ?? 0;
      const c2 = seriesData[1]?.[idx] ?? c1;
      const c3 = seriesData[2]?.[idx] ?? Math.min(c1, c2);
      const c4 = seriesData[3]?.[idx] ?? c2;
      const high = Math.max(c1, c2, c3, c4);
      const low = Math.min(c1, c2, c3, c4);
      return { label, open: c1, high, low, close: c4 };
    });

    const minV = Math.min(...candles.map(c => c.low));
    const maxV = Math.max(...candles.map(c => c.high));
    const scaleY = computeNiceAxisTicks(minV, maxV, 5);
    const yToPx = (v: number) =>
      plotY + plotH - ((v - scaleY.min) / (scaleY.max - scaleY.min || 1)) * plotH;

    const slotW = plotW / Math.max(1, candles.length);
    const bodyW = Math.min(28, slotW * 0.52);

    return (
      <g>
        {scaleY.ticks.map((tick, idx) => {
          const y = yToPx(tick);
          return (
            <g key={idx}>
              {config.showGrid && (
                <line x1={plotX} x2={plotX + plotW} y1={y} y2={y} stroke={gridStroke} strokeDasharray="3 3" />
              )}
              <text x={plotX - 8} y={y + 4} textAnchor="end" fill={inkSecondary} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {candles.map((c, idx) => {
          const cx = plotX + idx * slotW + slotW / 2;
          const yHigh = yToPx(c.high);
          const yLow = yToPx(c.low);
          const yOpen = yToPx(c.open);
          const yClose = yToPx(c.close);
          const bullish = c.close >= c.open;
          const color = bullish ? '#10b981' : '#f43f5e';
          const yTop = Math.min(yOpen, yClose);
          const h = Math.max(2, Math.abs(yClose - yOpen));

          return (
            <g
              key={`${c.label}-${idx}`}
              className="cursor-pointer"
              onMouseEnter={() =>
                showTip(
                  cx,
                  yHigh,
                  c.label,
                  [
                    `O: ${formatCompactNumber(c.open)} · H: ${formatCompactNumber(c.high)}`,
                    `L: ${formatCompactNumber(c.low)} · C: ${formatCompactNumber(c.close)}`,
                  ],
                  color
                )
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={2} />
              {isHlc ? (
                <>
                  <line x1={cx - bodyW / 2} x2={cx} y1={yOpen} y2={yOpen} stroke={color} strokeWidth={2.5} />
                  <line x1={cx} x2={cx + bodyW / 2} y1={yClose} y2={yClose} stroke={color} strokeWidth={2.5} />
                </>
              ) : (
                <rect
                  x={cx - bodyW / 2}
                  y={yTop}
                  width={bodyW}
                  height={h}
                  rx={2}
                  fill={color}
                  fillOpacity={0.9}
                />
              )}
              <text
                x={cx}
                y={plotY + plotH + 17}
                textAnchor="middle"
                fill={inkSecondary}
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {truncateLabel(c.label, 8)}
              </text>
            </g>
          );
        })}

        <line x1={plotX} x2={plotX} y1={plotY} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
        <line x1={plotX} x2={plotX + plotW} y1={plotY + plotH} y2={plotY + plotH} stroke={axisStroke} strokeWidth={1.2} />
      </g>
    );
  };

  const renderPolarArea = () => {
    const vals = seriesData[0] ?? [];
    const items = categories.map((label, idx) => ({
      label,
      value: Math.max(0, vals[idx] ?? 0),
      color: colors[idx % colors.length],
    }));
    const maxVal = Math.max(1, ...items.map(i => i.value));
    const cx = SVG_W / 2;
    const cy = plotY + plotH / 2 + 2;
    const maxR = Math.min(plotW, plotH) * 0.43;
    const sliceSpan = (Math.PI * 2) / Math.max(1, items.length);

    return (
      <g>
        {[0.25, 0.5, 0.75, 1].map((frac, idx) => (
          <circle
            key={`pr-${idx}`}
            cx={cx}
            cy={cy}
            r={maxR * frac}
            fill="none"
            stroke={gridStroke}
            strokeDasharray="3 3"
          />
        ))}

        {items.map((item, idx) => {
          const start = -Math.PI / 2 + idx * sliceSpan;
          const end = start + sliceSpan;
          const mid = (start + end) / 2;
          // Area proportional to value => radius proportional to sqrt(value / maxVal)
          const r = Math.max(10, Math.sqrt(item.value / maxVal) * maxR);
          const lbl = polarToCartesian(cx, cy, r + 15, mid);
          const tip = polarToCartesian(cx, cy, r * 0.65, mid);

          return (
            <g key={`${item.label}-${idx}`}>
              <path
                d={describeArcSlice(cx, cy, r, 0, start, end)}
                fill={item.color}
                fillOpacity={0.82}
                stroke={surfaceStroke}
                strokeWidth={1.8}
                className="cursor-pointer"
                onMouseEnter={() =>
                  showTip(
                    tip.x,
                    tip.y,
                    item.label,
                    [`${seriesNames[0]}: ${formatCompactNumber(item.value)}`],
                    item.color
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {config.showDataLabels && (
                <text
                  x={lbl.x}
                  y={lbl.y + 4}
                  textAnchor={Math.cos(mid) >= 0 ? 'start' : 'end'}
                  fill={inkSecondary}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="ui-monospace, monospace"
                >
                  {truncateLabel(item.label, 10)} ({formatCompactNumber(item.value)})
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderChartBody = () => {
    if (!hasData) {
      return (
        <text
          x={SVG_W / 2}
          y={SVG_H / 2}
          textAnchor="middle"
          fill={inkSecondary}
          fontSize={13}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {emptyMessage}
        </text>
      );
    }

    switch (config.family) {
      case 'column':
      case 'combo':
        return renderColumnOrCombo();
      case 'bar':
        return renderHorizontalBar();
      case 'line':
      case 'area':
        return renderLineOrArea();
      case 'pie':
        return renderPieOrDonut();
      case 'scatter':
        return renderScatterOrBubble();
      case 'histogram':
        return renderHistogramOrPareto();
      case 'boxplot':
        return renderBoxPlot();
      case 'waterfall':
        return renderWaterfall();
      case 'funnel':
        return renderFunnel();
      case 'radar':
        return renderRadar();
      case 'treemap':
        return renderTreemap();
      case 'sunburst':
        return renderSunburst();
      case 'heatmap':
        return renderHeatmap();
      case 'stock':
        return renderStockOhlc();
      case 'polar':
        return renderPolarArea();
      default:
        return renderColumnOrCombo();
    }
  };

  // Clamp tooltip position inside SVG bounds
  const tipW = 195;
  const tipH = tooltip ? 26 + tooltip.lines.length * 16 : 0;
  const tipX = tooltip ? Math.max(8, Math.min(SVG_W - tipW - 8, tooltip.x - tipW / 2)) : 0;
  const tipY = tooltip ? Math.max(8, tooltip.y - tipH - 12) : 0;

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border border-slate-800 ${
        config.canvasTheme === 'transparent'
          ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:14px_14px]'
          : ''
      }`}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label={config.title || 'Statistical Chart'}
      >
        {bgFill !== 'none' && <rect width={SVG_W} height={SVG_H} fill={bgFill} rx={8} />}

        {/* Title & Subtitle */}
        {config.title.trim() && (
          <text
            x={SVG_W / 2}
            y={26}
            textAnchor="middle"
            fill={inkPrimary}
            fontSize={16}
            fontWeight={700}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {config.title}
          </text>
        )}
        {config.subtitle.trim() && (
          <text
            x={SVG_W / 2}
            y={44}
            textAnchor="middle"
            fill={inkSecondary}
            fontSize={11.5}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {config.subtitle}
          </text>
        )}

        {renderLegend()}
        {renderChartBody()}
        {renderAxisTitles()}

        {/* Interactive Hover Tooltip */}
        {tooltip && (
          <g transform={`translate(${tipX}, ${tipY})`} pointerEvents="none">
            <rect
              width={tipW}
              height={tipH}
              rx={7}
              fill={isLight ? '#0f172a' : '#020617'}
              fillOpacity={0.94}
              stroke={tooltip.color || '#6366f1'}
              strokeWidth={1.2}
            />
            <text
              x={10}
              y={17}
              fill="#f8fafc"
              fontSize={11}
              fontWeight={700}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {truncateLabel(tooltip.title, 26)}
            </text>
            {tooltip.lines.map((line, idx) => (
              <text
                key={idx}
                x={10}
                y={33 + idx * 15}
                fill="#cbd5e1"
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {truncateLabel(line, 28)}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};
