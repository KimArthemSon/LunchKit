import { I } from "../Shared";
import { PRODUCT_STATUSES, type ProductStatus } from "../../api/products";

const STYLES: Record<ProductStatus, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20 group-hover:border-green-500/50",
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:border-yellow-500/50",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20 group-hover:border-gray-500/50",
};

const OPTION_LABELS: Record<ProductStatus, string> = {
  active: "Active — visible in store",
  draft: "Draft — hidden while editing",
  archived: "Archived — removed from store",
};

interface Props {
  value: ProductStatus;
  onChange: (status: ProductStatus) => void;
  saving?: boolean;
  label: string; // Accessible name, e.g. "Status for iPhone Mockup Pack"
}

// The status badge *is* the control. A transparent native <select> sits on top of the
// short pill, so the pill stays compact while keyboard, screen readers and the native
// option list (with longer explanations) all keep working.
export default function StatusSelect({ value, onChange, saving = false, label }: Props) {
  return (
    <div className="group relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductStatus)}
        disabled={saving}
        aria-label={label}
        title="Change status"
        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
      >
        {PRODUCT_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-[#0f0f17] text-white">
            {OPTION_LABELS[s]}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full border text-xs font-bold capitalize transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500/60 ${saving ? "opacity-60" : ""} ${STYLES[value]}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {value}
        {saving ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <I name="ChevronDown" size={12} className="opacity-70" />
        )}
      </span>
    </div>
  );
}
