import React from 'react';
import { CrosshairConfig, sanitizeCrosshairConfig } from './crosshair.logic';

interface CrosshairSvgProps {
  config: CrosshairConfig;
  size?: number;
  className?: string;
}

export const CrosshairSvg: React.FC<CrosshairSvgProps> = ({
  config,
  size = 160,
  className = '',
}) => {
  const c = sanitizeCrosshairConfig(config);
  const half = size / 2;
  const outlineW = c.showOutline ? c.outlineThickness : 0;

  const rects: Array<{ x: number; y: number; w: number; h: number }> = [
    { x: -(c.lineGap + c.lineLength), y: -c.lineThickness / 2, w: c.lineLength, h: c.lineThickness },
    { x: c.lineGap, y: -c.lineThickness / 2, w: c.lineLength, h: c.lineThickness },
    { x: -c.lineThickness / 2, y: c.lineGap, w: c.lineThickness, h: c.lineLength },
  ];
  if (!c.tStyle) {
    rects.push({
      x: -c.lineThickness / 2,
      y: -(c.lineGap + c.lineLength),
      w: c.lineThickness,
      h: c.lineLength,
    });
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <g transform={`translate(${half} ${half}) scale(${c.scale})`} opacity={c.opacity}>
        {c.showRing && (
          <g>
            {outlineW > 0 && (
              <circle
                cx={0}
                cy={0}
                r={c.ringRadius}
                fill="none"
                stroke={c.outlineColor}
                strokeOpacity={c.outlineOpacity}
                strokeWidth={c.ringThickness + outlineW * 2}
              />
            )}
            <circle
              cx={0}
              cy={0}
              r={c.ringRadius}
              fill="none"
              stroke={c.color}
              strokeWidth={c.ringThickness}
            />
          </g>
        )}

        {c.showLines && (
          <g transform={c.diagonal ? 'rotate(45)' : undefined}>
            {outlineW > 0 &&
              rects.map((r, idx) => (
                <rect
                  key={`o-${idx}`}
                  x={r.x - outlineW}
                  y={r.y - outlineW}
                  width={r.w + outlineW * 2}
                  height={r.h + outlineW * 2}
                  fill={c.outlineColor}
                  fillOpacity={c.outlineOpacity}
                />
              ))}
            {rects.map((r, idx) => (
              <rect
                key={`l-${idx}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={c.color}
              />
            ))}
          </g>
        )}

        {c.showDot && (
          <g>
            {outlineW > 0 && (
              <circle
                cx={0}
                cy={0}
                r={c.dotSize / 2 + outlineW}
                fill={c.outlineColor}
                fillOpacity={c.outlineOpacity}
              />
            )}
            <circle cx={0} cy={0} r={c.dotSize / 2} fill={c.dotColor} />
          </g>
        )}
      </g>
    </svg>
  );
};
