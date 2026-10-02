import { Link } from "react-router-dom";
import { I } from "../Shared";

interface Crumb {
  label: string;
  to?: string; // Omit for the current page
}

// "← Dashboard / My Orders / LK-2026-000002" — the first crumb is always the way back home
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Dashboard", to: "/dashboard" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mb-4 print:hidden">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {trail.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-gray-300">/</span>}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="inline-flex items-center gap-1.5 font-semibold text-gray-500 hover:text-purple-700 transition-colors"
              >
                {i === 0 && <I name="ArrowRight" size={14} className="rotate-180" />}
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-black truncate">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
