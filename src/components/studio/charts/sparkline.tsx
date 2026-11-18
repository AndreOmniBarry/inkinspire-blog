"use client";

import { useId, useState } from "react";

/**
 * Line/area chart as SVG with a crosshair tooltip and a table view (dataviz method: one axis,
 * 2px lines, recessive grid, legend for 2+ series plus a direct label on the latest value, colours
 * from validated chart tokens, identity never by colour alone).
 */
export function AreaChart({
  data,
  series,
  height = 170,
  label,
  formatDay = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)),
}: {
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; name: string; colour: 1 | 2 }>;
  height?: number;
  label: string;
  formatDay?: (d: string) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const w = 600;
  const h = height;
  const pad = { t: 14, r: 44, b: 22, l: 30 };
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.ceil(max / mag) * mag;
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (h - pad.t - pad.b);
  const colour = (c: 1 | 2) => `var(--chart-${c})`;
  const last = data.length - 1;
  return (
    <figure>
      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-labelledby={`${id}-t`}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * w;
            const i = Math.round(((px - pad.l) / (w - pad.l - pad.r)) * last);
            setHover(Math.max(0, Math.min(last, i)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <title id={`${id}-t`}>{label}</title>
          {[0, niceMax / 2, niceMax].map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1" />
              <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-ui)">{t}</text>
            </g>
          ))}
          {series.map((s, si) => {
            const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(Number(d[s.key]) || 0).toFixed(1)}`);
            const v = Number(data[last]?.[s.key]) || 0;
            return (
              <g key={s.key}>
                {si === 0 && <path d={`M${pts[0]} L${pts.join(" L")} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`} fill={colour(s.colour)} opacity="0.1" />}
                <polyline points={pts.join(" ")} fill="none" stroke={colour(s.colour)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(last)} cy={y(v)} r="4" fill={colour(s.colour)} stroke="var(--surface)" strokeWidth="2" />
                <text x={x(last) + 8} y={y(v) + 3.5 + si * 2} fontSize="11" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-ui)">{v}</text>
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} stroke="var(--ink-muted)" strokeWidth="1" strokeDasharray="3 3" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(Number(data[hover]?.[s.key]) || 0)} r="4" fill={colour(s.colour)} stroke="var(--surface)" strokeWidth="2" />
              ))}
            </g>
          )}
          {data.length > 1 && (
            <>
              <text x={x(0)} y={h - 5} fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-ui)">{formatDay(String(data[0].day))}</text>
              <text x={x(last)} y={h - 5} textAnchor="end" fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-ui)">Today</text>
            </>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-[var(--radius-m)] border border-rule bg-surface px-3 py-2 text-step-n2 shadow-lg"
            style={{ left: `${(x(hover) / w) * 100}%`, transform: `translateX(${hover > last / 2 ? "-105%" : "5%"})` }}
          >
            <p className="font-semibold">{formatDay(String(data[hover].day))}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2 text-ink-soft">
                <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: colour(s.colour) }} />
                {s.name}: <span className="font-semibold text-ink tabular-nums">{data[hover][s.key]}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-3 text-step-n2 text-ink-soft">
        {series.length > 1 ? (
          <span className="flex flex-wrap gap-4">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: colour(s.colour) }} />
                {s.name}
              </span>
            ))}
          </span>
        ) : (
          <span />
        )}
        <details className="relative">
          <summary className="cursor-pointer font-semibold underline-offset-2 hover:underline">View as table</summary>
          <div className="absolute right-0 z-20 mt-2 max-h-72 w-72 overflow-auto rounded-[var(--radius-m)] border border-rule bg-surface p-2 shadow-lg">
            <table className="w-full text-left text-step-n2">
              <caption className="sr-only">{label}</caption>
              <thead><tr><th className="p-1">Day</th>{series.map((s) => <th key={s.key} className="p-1 text-right">{s.name}</th>)}</tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={String(d.day)} className="border-t border-rule"><td className="p-1">{formatDay(String(d.day))}</td>{series.map((s) => <td key={s.key} className="p-1 text-right tabular-nums">{d[s.key]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figcaption>
    </figure>
  );
}
