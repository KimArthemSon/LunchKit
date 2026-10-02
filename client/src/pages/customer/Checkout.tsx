import { useCallback, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/customer/DashboardLayout";
import BillSummary from "../../components/customer/BillSummary";
import { I } from "../../components/Shared";
import Breadcrumbs from "../../components/customer/Breadcrumbs";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useAlert } from "../../context/AlertContext";
import { useAsync } from "../../hooks/useAsync";
import { checkout, getPaymentConfig } from "../../api/orders";
import { ApiError, errorMessage } from "../../api/http";
import type { CartResponse } from "../../api/cart";
import { assetUrl, sellerName } from "../../api/products";
import { formatMoney } from "../../utils/money";
import {
  BRAND_LABELS, SANDBOX_TEST_CARDS, detectBrand, formatCardNumber, formatExpiry,
  tokenizeCard, validateCard, type CardErrors, type CardInput,
} from "../../utils/card";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newAttemptKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const inputClass = (error?: string) =>
  `w-full px-4 py-3 bg-white border rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
    error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
  }`;

export default function Checkout() {
  const { user, token } = useAuth();
  const { items, summary, isLoading, applyCart, markPurchased, removeFromCart } = useCart();
  const alert = useAlert();
  const navigate = useNavigate();

  const loadConfig = useCallback(() => getPaymentConfig(), []);
  const { data: paymentConfig } = useAsync("payment-config", loadConfig);

  const [billing, setBilling] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [billingErrors, setBillingErrors] = useState<{ name?: string; email?: string }>({});
  // Prefill once the user finishes loading (AuthContext restores it after first render)
  const [prefilledFor, setPrefilledFor] = useState(user?._id);
  if (user && user._id !== prefilledFor) {
    setPrefilledFor(user._id);
    setBilling((b) => ({ name: b.name || user.name, email: b.email || user.email }));
  }

  const [card, setCard] = useState<CardInput>({ number: "", expiry: "", cvc: "", name: "" });
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  // Same key for retries of the same attempt (network blips) so we never double-charge
  const attemptKey = useRef<string | null>(null);

  const isFree = summary.totalCents === 0;
  const brand = detectBrand(card.number.replace(/\D/g, ""));

  const setCardField = (field: keyof CardInput, value: string) => {
    const formatted =
      field === "number" ? formatCardNumber(value)
        : field === "expiry" ? formatExpiry(value)
          : field === "cvc" ? value.replace(/\D/g, "").slice(0, 4)
            : value;
    setCard((c) => ({ ...c, [field]: formatted }));
    setCardErrors((e) => ({ ...e, [field]: undefined }));
    setPaymentError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || isPaying) return;
    setFormError("");
    setPaymentError("");

    const bErrors: typeof billingErrors = {};
    if (!billing.name.trim()) bErrors.name = "Enter your full name";
    if (!EMAIL_RE.test(billing.email.trim())) bErrors.email = "Enter a valid email for your receipt";
    const cErrors = isFree ? {} : validateCard(card);
    setBillingErrors(bErrors);
    setCardErrors(cErrors);
    if (Object.keys(bErrors).length || Object.keys(cErrors).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    if (!agreed) {
      setFormError("Please accept the terms to continue.");
      return;
    }

    attemptKey.current ??= newAttemptKey();
    setIsPaying(true);
    try {
      const order = await checkout(
        token,
        {
          billing: { name: billing.name.trim(), email: billing.email.trim() },
          paymentMethod: isFree ? undefined : tokenizeCard(card),
          expectedTotalCents: summary.totalCents,
        },
        attemptKey.current
      );
      markPurchased(order.items.map((i) => String(i.productId)));
      alert.success(`Receipt ${order.receiptNumber} was sent to ${order.billing.email}.`, { title: "Payment successful" });
      navigate(`/orders/${order._id}?placed=1`, { replace: true });
    } catch (err) {
      // The server answered, so this attempt is finished — the next click is a new attempt.
      // (On a network error we keep the key: a retry is then safely deduplicated.)
      if (err instanceof ApiError) attemptKey.current = null;

      if (err instanceof ApiError && ["PRICE_CHANGED", "CART_CHANGED", "CART_EMPTY"].includes(err.code ?? "")) {
        applyCart(err.data.cart as CartResponse);
        setFormError(`${err.code === "PRICE_CHANGED" ? err.message : "Your cart was updated."} You have not been charged.`);
      } else if (err instanceof ApiError && err.code === "PAYMENT_FAILED") {
        setPaymentError(`${err.message} You have not been charged.`);
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setIsPaying(false);
    }
  };

  if (!token) {
    return (
      <CheckoutShell>
        <EmptyState icon="Shield" title="Log in to check out" body="You need an account so we can deliver your downloads.">
          <Link to="/login" className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Log in</Link>
        </EmptyState>
      </CheckoutShell>
    );
  }

  if (isLoading) {
    return <CheckoutShell><p className="text-center text-gray-500 py-20">Loading your cart...</p></CheckoutShell>;
  }

  if (items.length === 0) {
    return (
      <CheckoutShell>
        <EmptyState icon="CreditCard" title="Your cart is empty" body="Add some assets to your cart, then come back to check out.">
          <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Browse products</Link>
        </EmptyState>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <form onSubmit={handleSubmit} noValidate className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
        {/* ── Left: details ── */}
        <div className="space-y-6">
          <Card step={1} title="Contact & billing">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" error={billingErrors.name}>
                <input
                  value={billing.name}
                  onChange={(e) => { setBilling((b) => ({ ...b, name: e.target.value })); setBillingErrors((er) => ({ ...er, name: undefined })); }}
                  autoComplete="name"
                  className={inputClass(billingErrors.name)}
                  placeholder="Juan Dela Cruz"
                />
              </Field>
              <Field label="Email for receipt" error={billingErrors.email}>
                <input
                  type="email"
                  value={billing.email}
                  onChange={(e) => { setBilling((b) => ({ ...b, email: e.target.value })); setBillingErrors((er) => ({ ...er, email: undefined })); }}
                  autoComplete="email"
                  className={inputClass(billingErrors.email)}
                  placeholder="you@example.com"
                />
              </Field>
            </div>
          </Card>

          {!isFree && (
            <Card step={2} title="Payment">
              {paymentConfig?.testMode && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                  <p className="font-bold text-amber-800 flex items-center gap-2">
                    <I name="AlertTriangle" size={16} /> Test mode — no real money is charged
                  </p>
                  <p className="text-amber-700 mt-1">Use any future expiry and any CVC. Click a test card to fill it in:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SANDBOX_TEST_CARDS.map((t) => (
                      <button
                        key={t.number}
                        type="button"
                        onClick={() => {
                          setCard((c) => ({ ...c, number: t.number, expiry: c.expiry || "12 / 34", cvc: c.cvc || "123", name: c.name || billing.name }));
                          setCardErrors({});
                          setPaymentError("");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 font-mono text-xs text-amber-900 hover:border-amber-400"
                      >
                        {t.number} <span className="font-sans text-amber-600">· {t.result}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentError && (
                <div role="alert" className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
                  <I name="AlertTriangle" size={16} className="shrink-0 mt-0.5" /> {paymentError}
                </div>
              )}

              <div className="space-y-4">
                <Field label="Card number" error={cardErrors.number}>
                  <div className="relative">
                    <input
                      value={card.number}
                      onChange={(e) => setCardField("number", e.target.value)}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      className={`${inputClass(cardErrors.number)} font-mono pr-28`}
                      placeholder="1234 1234 1234 1234"
                    />
                    {card.number && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 uppercase">
                        {BRAND_LABELS[brand]}
                      </span>
                    )}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry" error={cardErrors.expiry}>
                    <input
                      value={card.expiry}
                      onChange={(e) => setCardField("expiry", e.target.value)}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      className={`${inputClass(cardErrors.expiry)} font-mono`}
                      placeholder="MM / YY"
                    />
                  </Field>
                  <Field label="Security code" error={cardErrors.cvc}>
                    <input
                      value={card.cvc}
                      onChange={(e) => setCardField("cvc", e.target.value)}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      className={`${inputClass(cardErrors.cvc)} font-mono`}
                      placeholder={brand === "amex" ? "1234" : "123"}
                    />
                  </Field>
                </div>
                <Field label="Name on card" error={cardErrors.name}>
                  <input
                    value={card.name}
                    onChange={(e) => setCardField("name", e.target.value)}
                    autoComplete="cc-name"
                    className={inputClass(cardErrors.name)}
                    placeholder="As shown on the card"
                  />
                </Field>
              </div>

              <p className="mt-4 text-xs text-gray-500 flex items-center gap-1.5">
                <I name="Shield" size={14} className="text-green-600" />
                Your card details are tokenized in your browser — LaunchKit never stores or sees your full card number.
              </p>
            </Card>
          )}

          <Card step={isFree ? 2 : 3} title="Review & confirm">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => { setAgreed(e.target.checked); setFormError(""); }}
                className="mt-1 w-4 h-4 accent-purple-600"
              />
              <span className="text-sm text-gray-600">
                I agree to the LaunchKit Terms of Service and License Agreement. I understand these are{" "}
                <strong className="text-black">digital products delivered immediately</strong>, and I consent to immediate access,
                which means the purchase is non-refundable once the files have been downloaded.
              </span>
            </label>
          </Card>
        </div>

        {/* ── Right: order summary (the bill) ── */}
        <aside className="lg:sticky lg:top-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-black text-black mb-4">Order summary</h2>
          <ul className="divide-y divide-gray-100 mb-5 max-h-80 overflow-y-auto -mx-1 px-1">
            {items.map((item) => (
              <li key={item._id} className="flex gap-3 py-3">
                {item.previewImageUrl ? (
                  <img src={assetUrl(item.previewImageUrl)} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 shrink-0">
                    <I name="Image" size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-black truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.category}{sellerName(item) && ` · ${sellerName(item)}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item._id)}
                    disabled={isPaying}
                    className="text-xs text-gray-400 hover:text-red-500 mt-0.5"
                  >
                    Remove
                  </button>
                </div>
                <span className="text-sm font-bold text-black">{formatMoney(Math.round(item.price * 100), summary.currency)}</span>
              </li>
            ))}
          </ul>

          <BillSummary {...summary} totalLabel="Total due today" />

          {formError && (
            <div role="alert" className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
          )}

          <button
            type="submit"
            disabled={isPaying}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-wait text-white font-bold py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98]"
          >
            <I name="Shield" size={18} />
            {isPaying ? "Processing payment..." : isFree ? "Get for free" : `Pay ${formatMoney(summary.totalCents, summary.currency)}`}
          </button>

          <ul className="mt-5 space-y-2 text-xs text-gray-500">
            <li className="flex items-center gap-2"><I name="Zap" size={14} className="text-purple-600" /> Instant access right after payment</li>
            <li className="flex items-center gap-2"><I name="Download" size={14} className="text-purple-600" /> Lifetime downloads from your library</li>
            <li className="flex items-center gap-2"><I name="FileText" size={14} className="text-purple-600" /> Official receipt emailed to you</li>
          </ul>
        </aside>
      </form>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6">
        <Breadcrumbs items={[{ label: "Checkout" }]} />
        <h1 className="text-3xl md:text-4xl font-black text-black mb-8">Checkout</h1>
        {children}
      </div>
    </DashboardLayout>
  );
}

function Card({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="flex items-center gap-3 text-lg font-black text-black mb-5">
        <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function EmptyState({ icon, title, body, children }: { icon: string; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
      <I name={icon} size={44} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-2xl font-black text-black">{title}</h2>
      <p className="text-gray-500 mt-2 mb-6">{body}</p>
      {children}
    </div>
  );
}
