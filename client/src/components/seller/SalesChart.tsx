import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { SeriesPoint } from "../../api/seller";
import { formatMoney } from "../../utils/money";

interface SalesChartProps {
  series: SeriesPoint[];
  unit: "day" | "week" | "month";
  currency: string;
  dimmed?: boolean; // Refetching: hold the previous render at reduced opacity
}

// Brand violet, matching the landing page chart — ≥3:1 contrast on the stone-900 surface
const SERIES_COLOR = "#8b5cf6";
const SURFACE = "#1c1917"; // stone-900: ring colour that separates dots from the line
const HEIGHT = 256;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

const parseKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

const bucketLabel = (key: string, unit: SalesChartProps["unit"], long = false) => {
  const date = parseKey(key);
  if (unit === "month") return date.toLocaleDateString(undefined, { month: "short", ...(long ? { year: "numeric" } : {}) });
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return unit === "week" && long ? `Week of ${label}` : label;
};

// Clean, rounded y-axis ticks (0 / 25 / 50 / 75 / 100 ...)
const niceTicks = (maxCents: number) => {
  const max = Math.max(maxCents, 100);
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
};

const compactMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

export default function SalesChart({ series, unit, currency, dimmed = false }: SalesChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Real pixel geometry (no viewBox stretching) so lines stay 2px and dots stay round
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = series.reduce((sum, p) => sum + p.netCents, 0);
  const ticks = niceTicks(Math.max(0, ...series.map((p) => p.netCents)));
  const yMax = ticks[ticks.length - 1]!;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
  const y = (cents: number) => PAD.top + plotH - (cents / yMax) * plotH;

  const linePath = series.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.netCents)}`).join(" ");
  const areaPath = series.length ? `${linePath} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";

  // Show ~6 x-axis labels max, always including the last bucket
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));
  const showXLabel = (i: number) => i === series.length - 1 || (i % labelEvery === 0 && series.length - 1 - i >= labelEvery / 2);

  const handlePointer = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setActive(Math.round(rel * (series.length - 1)));
  };

  const handleKey = (e: KeyboardEvent) => {
    if (!series.length) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setActive((a) => Math.min(series.length - 1, (a ?? -1) + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive((a) => Math.max(0, (a ?? series.length) - 1)); }
    if (e.key === "Escape") setActive(null);
  };

  const last = series.length - 1;
  const point = active !== null ? series[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active), 90), width - 90) : 0;

  return (
    // h-full: fills its grid cell so it lines up with neighbouring cards
    <div className="h-full bg-stone-900 border border-stone-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">Earnings</h3>
          <p className="text-sm text-stone-400">
            <span className="text-white font-medium tabular-nums">{formatMoney(total, currency)}</span> after platform fees,
            by {unit}
          </p>
        </div>
        <button
          onClick={() => setShowTable((s) => !s)}
          className="text-xs font-medium text-stone-400 hover:text-white px-3 py-1.5 rounded-full border border-stone-700 hover:border-stone-500 transition-colors"
        >
          {showTable ? "View chart" : "View table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-stone-500 text-xs sticky top-0 bg-stone-900">
              <tr>
                <th className="py-2 font-medium">{unit === "month" ? "Month" : unit === "week" ? "Week" : "Day"}</th>
                <th className="py-2 font-medium text-right">Sales</th>
                <th className="py-2 font-medium text-right">Gross</th>
                <th className="py-2 font-medium text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 tabular-nums">
              {[...series].reverse().map((p) => (
                <tr key={p.date}>
                  <td className="py-2 text-stone-300">{bucketLabel(p.date, unit, true)}</td>
                  <td className="py-2 text-right text-stone-300">{p.sales}</td>
                  <td className="py-2 text-right text-stone-300">{formatMoney(p.grossCents, currency)}</td>
                  <td className="py-2 text-right text-white font-medium">{formatMoney(p.netCents, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className={`relative w-full transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded-lg ${dimmed ? "opacity-50" : ""}`}
          style={{ height: HEIGHT }}
          tabIndex={0}
          role="img"
          aria-label={`Earnings by ${unit}: ${formatMoney(total, currency)} total. Use left and right arrow keys to read values.`}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
        >
          {width > 0 && (
            <svg width={width} height={HEIGHT} className="block">
              {/* Recessive hairline grid + y ticks */}
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#292524" strokeWidth={1} />
                  <text x={PAD.left - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-stone-500 text-[11px] tabular-nums">
                    {compactMoney(t, currency)}
                  </text>
                </g>
              ))}

              {/* X labels */}
              {series.map((p, i) =>
                showXLabel(i) ? (
                  <text key={p.date} x={x(i)} y={HEIGHT - 8} textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"} className="fill-stone-500 text-[11px]">
                    {bucketLabel(p.date, unit)}
                  </text>
                ) : null
              )}

              {/* Area wash (~10%) + 2px line */}
              <path d={areaPath} fill={SERIES_COLOR} fillOpacity={0.1} />
              <path d={linePath} fill="none" stroke={SERIES_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

              {/* End marker with a surface ring */}
              {series.length > 0 && (
                <circle cx={x(last)} cy={y(series[last]!.netCents)} r={4} fill={SERIES_COLOR} stroke={SURFACE} strokeWidth={2} />
              )}

              {/* Crosshair */}
              {active !== null && point && (
                <g pointerEvents="none">
                  <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="#57534e" strokeWidth={1} />
                  <circle cx={x(active)} cy={y(point.netCents)} r={5} fill={SERIES_COLOR} stroke={SURFACE} strokeWidth={2} />
                </g>
              )}

              {/* Hit area: the whole plot, snapping to the nearest bucket */}
              <rect
                x={PAD.left}
                y={PAD.top}
                width={plotW}
                height={plotH}
                fill="transparent"
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                onPointerLeave={() => setActive(null)}
              />
            </svg>
          )}

          {/* Tooltip — values lead, labels follow */}
          {point && active !== null && (
            <div
              className="absolute top-0 -translate-x-1/2 pointer-events-none bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 shadow-xl text-xs min-w-[160px]"
              style={{ left: tooltipLeft }}
            >
              <p className="text-stone-400 mb-1.5">{bucketLabel(point.date, unit, true)}</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 rounded-full" style={{ background: SERIES_COLOR }} />
                <span className="text-white font-semibold text-sm tabular-nums">{formatMoney(point.netCents, currency)}</span>
                <span className="text-stone-400">earnings</span>
              </div>
              <p className="text-stone-400 mt-1 tabular-nums">
                {point.sales} {point.sales === 1 ? "sale" : "sales"} · {formatMoney(point.grossCents, currency)} gross
              </p>
            </div>
          )}

          {total === 0 && width > 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-stone-500 pointer-events-none">
              No sales in this period yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
