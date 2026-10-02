const formatters = new Map<string, Intl.NumberFormat>();

export const formatMoney = (cents: number, currency = "USD") => {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
};

export const formatPercent = (rate: number) => `${+(rate * 100).toFixed(2)}%`;

export const formatDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
