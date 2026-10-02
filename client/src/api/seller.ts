import { apiRequest } from "./http";

export type SaleStatus = "completed" | "refunded";

export interface Sale {
  orderId: string;
  orderNumber: string;
  status: SaleStatus;
  paidAt: string;
  customerName: string;
  customerEmail: string; // Masked by the server
  productId: string;
  productTitle: string;
  category: string;
  priceCents: number;
  feeCents: number;
  earningsCents: number;
}

export interface SalesPage {
  sales: Sale[];
  summary: { count: number; grossCents: number; feesCents: number; netCents: number; currency: string };
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SalesQuery {
  search?: string;
  status?: SaleStatus;
  page?: number;
  limit?: number;
}

export type PayoutMethod = "bank" | "gcash" | "paypal";

export interface PayoutAccount {
  method: PayoutMethod;
  accountName: string;
  bankName?: string;
  accountNumberMasked: string;
}

export interface PayoutAccountInput {
  method: PayoutMethod;
  accountName: string;
  accountNumber: string;
  bankName?: string;
}

export interface Balance {
  currency: string;
  availableCents: number;
  pendingCents: number;
  processingCents: number;
  paidOutCents: number;
  lifetimeGrossCents: number;
  lifetimeFeesCents: number;
  lifetimeNetCents: number;
  holdDays: number;
}

export interface Transaction {
  id: string;
  type: "earning" | "payout";
  reference: string;
  description: string;
  date: string;
  amountCents: number; // Payouts are negative
  status: "pending" | "available" | "refunded" | "processing" | "paid" | "failed";
  availableOn?: string;
}

export interface EarningsResponse {
  balance: Balance;
  minPayoutCents: number;
  platformFeeRate: number;
  payoutAccount: PayoutAccount | null;
  hasProcessingPayout: boolean;
  transactions: Transaction[];
}

export interface PayoutResult {
  payoutNumber: string;
  amountCents: number;
  status: string;
  destination: PayoutAccount;
  createdAt: string;
}

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  bank: "Bank transfer",
  gcash: "GCash",
  paypal: "PayPal",
};

export const getSales = (token: string, query: SalesQuery = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return apiRequest<SalesPage>(`/api/seller/sales?${params}`, token);
};

export const getEarnings = (token: string) => apiRequest<EarningsResponse>("/api/seller/earnings", token);

export const updatePayoutAccount = (token: string, input: PayoutAccountInput) =>
  apiRequest<{ payoutAccount: PayoutAccount }>("/api/seller/payout-account", token, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const requestPayout = (token: string, amountCents: number) =>
  apiRequest<PayoutResult>("/api/seller/payouts", token, {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });

// ── Dashboard overview ──

export type OverviewRange = "7d" | "30d" | "90d" | "12m";

export const OVERVIEW_RANGES: { value: OverviewRange; label: string; previousLabel: string }[] = [
  { value: "7d", label: "Last 7 days", previousLabel: "previous 7 days" },
  { value: "30d", label: "Last 30 days", previousLabel: "previous 30 days" },
  { value: "90d", label: "Last 90 days", previousLabel: "previous 90 days" },
  { value: "12m", label: "Last 12 months", previousLabel: "previous 12 months" },
];

export interface SeriesPoint {
  date: string; // Bucket start, YYYY-MM-DD in the seller's local calendar
  sales: number;
  grossCents: number;
  netCents: number;
}

export interface Overview {
  range: OverviewRange;
  unit: "day" | "week" | "month";
  currency: string;
  stats: {
    earnings: { valueCents: number; previousCents: number; change: number | null };
    grossSales: { valueCents: number; previousCents: number; change: number | null };
    sales: { value: number; previous: number; change: number | null };
    products: { active: number; draft: number; archived: number };
    balance: { availableCents: number; pendingCents: number; holdDays: number };
  };
  series: SeriesPoint[];
  topProducts: {
    productId: string;
    title: string;
    previewImageUrl?: string;
    status: string;
    sales: number;
    grossCents: number;
    netCents: number;
  }[];
  recentOrders: {
    orderId: string;
    orderNumber: string;
    status: SaleStatus;
    paidAt: string;
    customerName: string;
    customerEmail: string;
    productTitle: string;
    priceCents: number;
    earningsCents: number;
  }[];
}

export const getOverview = (token: string, range: OverviewRange) =>
  apiRequest<Overview>(`/api/seller/overview?range=${range}&tzOffset=${new Date().getTimezoneOffset()}`, token);
