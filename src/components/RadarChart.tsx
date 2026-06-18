import React from 'react';

interface RadarChartProps {
  data: { label: string; value: number }[]; // value 0-100
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 240 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = data.length;
  if (n < 3) return null;

  const getPoint = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      {gridLevels.map((level, li) => (
        <polygon key={li}
          points={data.map((_, i) => { const p = getPoint(i, r * level); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}
      {/* Axes */}
      {data.map((_, i) => {
        const p = getPoint(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon
        points={data.map((d, i) => { const p = getPoint(i, r * (d.value / 100)); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(255, 45, 120, 0.2)" stroke="#ff2d78" strokeWidth="2" />
      {/* Data points */}
      {data.map((d, i) => {
        const p = getPoint(i, r * (d.value / 100));
        return <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ff2d78" stroke="white" strokeWidth="1.5" />;
      })}
      {/* Labels */}
      {data.map((d, i) => {
        const p = getPoint(i, r + 22);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] fill-white/60 font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {d.label}
          </text>
        );
      })}
      {/* Center value labels */}
      {data.map((d, i) => {
        const p = getPoint(i, r * (d.value / 100) + 12);
        return d.value > 0 ? (
          <text key={`v${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="text-[8px] fill-pink-400 font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {d.value}%
          </text>
        ) : null;
      })}
    </svg>
  );
};
