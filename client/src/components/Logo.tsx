/* ─── LaunchKit brand mark: an "L" with a launch arrow leaving its corner ──
   Keep in sync with public/favicon.svg. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#7c3aed" />
      <path d="M12.5 10v17h15" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 21.5 28 12M21.5 11.5H28.5V18.5" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Mark + wordmark. `tone` picks the wordmark colour for dark or light backgrounds. */
export function Logo({ size = 32, tone = "light", className = "", textClassName = "text-xl" }: {
  size?: number;
  tone?: "light" | "dark";
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0" />
      <span className={`font-bold tracking-tight ${tone === "light" ? "text-white" : "text-gray-900"} ${textClassName}`}>
        LaunchKit
      </span>
    </span>
  );
}
