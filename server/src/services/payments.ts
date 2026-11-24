import crypto from "crypto";
import Stripe from "stripe";

// Payment provider abstraction. The client tokenizes the card (raw card numbers never
// reach this server — Stripe Elements / the sandbox form), then we charge the token.
// PAYMENT_PROVIDER picks one: "sandbox" (default, no account needed) or "stripe" (test mode).

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
  publishableKey?: string; // Sent to the browser so it can load the provider's card form
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

// ── Stripe (test mode only) ──
// The browser turns the card into a PaymentMethod (pm_...) with Stripe Elements; we create
// and confirm a PaymentIntent for it. Live keys are refused, so no real money can move.
const createStripeProvider = (): PaymentProvider => {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  if (!secretKey || !publishableKey) {
    throw new Error("PAYMENT_PROVIDER=stripe needs STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in server/.env");
  }
  if (!/^(sk|rk)_test_/.test(secretKey) || !publishableKey.startsWith("pk_test_")) {
    throw new Error("Only Stripe TEST keys are allowed (sk_test_... / pk_test_...). This app is a demo and must never charge real money.");
  }
  const stripe = new Stripe(secretKey);

  return {
    name: "stripe",
    testMode: true,
    publishableKey,
    async charge({ amountCents, currency, paymentMethod, description, idempotencyKey, metadata }) {
      if (!/^pm_[A-Za-z0-9_]+$/.test(paymentMethod ?? "")) return { status: "failed", failureMessage: "Invalid payment method." };

      let card: CardDetails | undefined;
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethod);
        if (pm.card) card = { brand: pm.card.brand, last4: pm.card.last4 };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError) return { status: "failed", failureMessage: "Invalid payment method." };
        throw error;
      }

      try {
        const intent = await stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: currency.toLowerCase(),
            payment_method: paymentMethod,
            confirm: true,
            // Card-only, no redirect-based methods: checkout completes in one request
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
            description,
            metadata,
          },
          { idempotencyKey },
        );
        if (intent.status === "succeeded") return { status: "succeeded", transactionId: intent.id, card };

        // 3D Secure needs a browser step this checkout doesn't do yet — cancel so nothing is held
        await stripe.paymentIntents.cancel(intent.id).catch(() => {});
        return {
          status: "failed",
          card,
          failureMessage: intent.status === "requires_action"
            ? "This card needs extra authentication (3D Secure), which the demo checkout doesn't support. Try 4242 4242 4242 4242."
            : "The payment could not be completed.",
        };
      } catch (error) {
        // Declines, insufficient funds, expired card, wrong CVC...: Stripe's message is user-friendly
        if (error instanceof Stripe.errors.StripeCardError) {
          return { status: "failed", failureMessage: error.message, card };
        }
        throw error; // Network/auth problems → checkout reports "payment service unavailable"
      }
    },
  };
};

const providers: Record<string, () => PaymentProvider> = {
  sandbox: () => sandboxProvider,
  stripe: createStripeProvider,
};
const instances = new Map<string, PaymentProvider>();

// Throws on a misconfiguration, so call it once at startup to fail fast
export const getPaymentProvider = (): PaymentProvider => {
  const name = process.env.PAYMENT_PROVIDER || "sandbox";
  let provider = instances.get(name);
  if (!provider) {
    const create = providers[name];
    if (!create) throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
    provider = create();
    instances.set(name, provider);
  }
  return provider;
};
