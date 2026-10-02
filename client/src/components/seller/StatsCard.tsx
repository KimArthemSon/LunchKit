import { I } from "../Shared";

interface StatsCardProps {
  label: string;
  value: string;
  icon: string;
  change?: string; // e.g. "+12.5%", "New", "2 drafts"
  trend?: "up" | "down" | "neutral";
  caption?: string; // e.g. "vs previous 30 days"
}

export default function StatsCard({ label, value, icon, change, trend = "neutral", caption }: StatsCardProps) {
  const tone = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-stone-400";
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="text-stone-400 text-sm">{label}</span>
        <span className="text-stone-500"><I name={icon} size={18} /></span>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-white mb-2 tabular-nums">{value}</div>
      {(change || caption) && (
        <div className={`flex items-center gap-1 text-sm font-medium ${tone}`}>
          {trend !== "neutral" && <I name={trend === "up" ? "TrendingUp" : "TrendingDown"} size={14} />}
          {change} {caption && <span className="text-stone-500 font-normal">{caption}</span>}
        </div>
      )}
    </div>
  );
}
