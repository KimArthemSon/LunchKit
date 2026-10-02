import { formatMoney, formatPercent } from "../../utils/money";

interface BillSummaryProps {
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  itemCount?: number;
  totalLabel?: string;
  variant?: "light" | "dark";
}

// Subtotal / tax / total block shared by the cart, checkout and receipts
export default function BillSummary({
  subtotalCents, taxRate, taxCents, totalCents, currency,
  itemCount, totalLabel = "Total", variant = "light",
}: BillSummaryProps) {
  const dark = variant === "dark";
  const muted = dark ? "text-gray-400" : "text-gray-500";
  const strong = dark ? "text-white" : "text-black";

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className={muted}>Subtotal{itemCount !== undefined && ` (${itemCount} ${itemCount === 1 ? "item" : "items"})`}</dt>
        <dd className={`${strong} font-medium`}>{formatMoney(subtotalCents, currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className={muted}>Tax ({formatPercent(taxRate)})</dt>
        <dd className={`${strong} font-medium`}>{formatMoney(taxCents, currency)}</dd>
      </div>
      <div className={`flex justify-between items-baseline pt-3 mt-1 border-t ${dark ? "border-white/10" : "border-gray-200"}`}>
        <dt className={`${strong} font-bold`}>{totalLabel}</dt>
        <dd className={`${strong} font-black text-xl`}>
          {formatMoney(totalCents, currency)} <span className={`text-xs font-medium ${muted}`}>{currency}</span>
        </dd>
      </div>
    </dl>
  );
}
