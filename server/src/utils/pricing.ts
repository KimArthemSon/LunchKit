// All money math happens in integer cents to avoid floating-point drift.
// Rates are read lazily because dotenv loads after module imports are evaluated.

export const CURRENCY = "USD";

export const getTaxRate = () => {
  const rate = Number(process.env.TAX_RATE ?? 0.08);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0.08;
};

export const getPlatformFeeRate = () => {
  const rate = Number(process.env.PLATFORM_FEE_RATE ?? 0.1);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.1;
};

export const toCents = (amount: number) => Math.round(amount * 100);

export interface PriceSummary {
  currency: string;
  itemCount: number;
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
}

export const summarize = (prices: number[]): PriceSummary => {
  const taxRate = getTaxRate();
  const subtotalCents = prices.reduce((sum, price) => sum + toCents(price), 0);
  const taxCents = Math.round(subtotalCents * taxRate);
  return {
    currency: CURRENCY,
    itemCount: prices.length,
    subtotalCents,
    taxRate,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
};

// Marketplace split for one line item
export const splitRevenue = (unitPriceCents: number) => {
  const platformFeeCents = Math.round(unitPriceCents * getPlatformFeeRate());
  return { platformFeeCents, sellerEarningsCents: unitPriceCents - platformFeeCents };
};

// Seller earnings clear after a holding period (refund / chargeback window)
export const getEarningsHoldDays = () => {
  const days = Number(process.env.EARNINGS_HOLD_DAYS ?? 7);
  return Number.isFinite(days) && days >= 0 ? days : 7;
};

export const getMinPayoutCents = () => {
  const cents = Number(process.env.MIN_PAYOUT_CENTS ?? 1000);
  return Number.isFinite(cents) && cents >= 0 ? cents : 1000;
};
