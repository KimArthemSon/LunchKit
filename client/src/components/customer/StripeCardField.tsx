import { useImperativeHandle, useState } from "react";
import type { Ref } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";

// Card input rendered by Stripe in its own iframe: the card number never touches our page
// or server. The parent asks it for a PaymentMethod id (pm_...) at submit time.
export interface StripeCardHandle {
  // `shownInField`: the message is already displayed under the card field
  createPaymentMethod: (billing: { name: string; email: string }) => Promise<{ id: string } | { error: string; shownInField?: boolean }>;
}

const stripePromises = new Map<string, Promise<Stripe | null>>();
const getStripe = (publishableKey: string) => {
  let promise = stripePromises.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromises.set(publishableKey, promise);
  }
  return promise;
};

interface Props {
  publishableKey: string;
  ref: Ref<StripeCardHandle>;
  onChange?: () => void;
}

export default function StripeCardField({ publishableKey, ref, onChange }: Props) {
  return (
    <Elements stripe={getStripe(publishableKey)}>
      <CardInput handleRef={ref} onChange={onChange} />
    </Elements>
  );
}

function CardInput({ handleRef, onChange }: { handleRef: Ref<StripeCardHandle>; onChange?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  useImperativeHandle(handleRef, () => ({
    async createPaymentMethod(billing) {
      const card = elements?.getElement(CardElement);
      if (!stripe || !card) return { error: "The payment form is still loading. Please try again in a moment." };
      const result = await stripe.createPaymentMethod({ type: "card", card, billing_details: billing });
      if (result.error) {
        const message = result.error.message ?? "Please check your card details.";
        setError(message);
        return { error: message, shownInField: true };
      }
      return { id: result.paymentMethod.id };
    },
  }), [stripe, elements]);

  return (
    <div>
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">Card details</span>
      <div
        className={`px-4 py-3.5 bg-white border rounded-xl transition-all ${
          error ? "border-red-300 ring-2 ring-red-200" : focused ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200"
        }`}
      >
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: { fontSize: "16px", color: "#000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", "::placeholder": { color: "#9ca3af" } },
              invalid: { color: "#dc2626" },
            },
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setError(e.error?.message ?? "");
            onChange?.();
          }}
        />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
      {!stripe && <span className="block text-xs text-gray-500 mt-1">Loading secure card form…</span>}
    </div>
  );
}
