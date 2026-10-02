import crypto from "crypto";

// Payment provider abstraction. The client tokenizes the card (raw card numbers never
// reach this server — same model as Stripe Elements / PayMongo), then we charge the token.
// To go live, add a provider (e.g. Stripe PaymentIntents) and set PAYMENT_PROVIDER.

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  paymentMethod: string; // Provider token, never a card number
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface CardDetails {
  brand: string;
  last4: string;
}

export type ChargeResult =
  | { status: "succeeded"; transactionId: string; card?: CardDetails }
  | { status: "failed"; failureMessage: string; card?: CardDetails };

export interface PaymentProvider {
  name: string;
  testMode: boolean;
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

// ── Sandbox: behaves like a real gateway's test mode ──
// Tokens look like "pm_sandbox_visa_4242". Outcome is decided here by the card's last 4,
// mirroring Stripe's test cards.
const SANDBOX_DECLINES: Record<string, string> = {
  "0002": "Your card was declined.",
  "9995": "Your card has insufficient funds.",
  "0069": "Your card has expired.",
  "0127": "Your card's security code is incorrect.",
};

const sandboxProvider: PaymentProvider = {
  name: "sandbox",
  testMode: true,
  async charge({ paymentMethod, amountCents }) {
    const match = /^pm_sandbox_(visa|mastercard|amex|discover|jcb|card)_(\d{4})$/.exec(paymentMethod ?? "");
    if (!match) return { status: "failed", failureMessage: "Invalid payment method." };

    const card = { brand: match[1]!, last4: match[2]! };
    await new Promise((resolve) => setTimeout(resolve, 600)); // Simulate gateway latency

    const decline = SANDBOX_DECLINES[card.last4];
    if (decline) return { status: "failed", failureMessage: decline, card };
    if (amountCents <= 0) return { status: "failed", failureMessage: "Invalid amount.", card };

    return { status: "succeeded", transactionId: `sbx_${crypto.randomUUID().replace(/-/g, "")}`, card };
  },
};

const providers: Record<string, PaymentProvider> = {
  sandbox: sandboxProvider,
};

export const getPaymentProvider = (): PaymentProvider => {
  const name = process.env.PAYMENT_PROVIDER || "sandbox";
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
  return provider;
};
