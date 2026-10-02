import { useCallback, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import SellerDashboardLayout from "../../components/seller/SellerDashboardLayout";
import SellerHeader from "../../components/seller/SellerHeader";
import { I } from "../../components/Shared";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { useAsync } from "../../hooks/useAsync";
import { errorMessage } from "../../api/http";
import {
  getEarnings, requestPayout, updatePayoutAccount, PAYOUT_METHOD_LABELS,
  type EarningsResponse, type PayoutAccount, type PayoutMethod, type Transaction,
} from "../../api/seller";
import { formatDate, formatMoney, formatPercent } from "../../utils/money";

const TX_STATUS_STYLES: Record<Transaction["status"], string> = {
  available: "bg-green-500/10 text-green-400",
  paid: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  processing: "bg-blue-500/10 text-blue-400",
  refunded: "bg-gray-500/10 text-gray-400",
  failed: "bg-red-500/10 text-red-400",
};

export default function SellerEarnings() {
  const { token } = useAuth();
  const alert = useAlert();
  const load = useCallback(() => getEarnings(token!), [token]);
  const { data, isLoading, error, reload } = useAsync(token ? "earnings" : null, load);
  const [modal, setModal] = useState<"account" | "payout" | null>(null);

  const currency = data?.balance.currency ?? "USD";
  const money = (cents: number) => formatMoney(cents, currency);

  const openPayout = () => {
    if (!data) return;
    if (!data.payoutAccount) {
      alert.info("Add a payout method first so we know where to send your money.");
      return setModal("account");
    }
    setModal("payout");
  };

  return (
    <SellerDashboardLayout>
      <SellerHeader title="Earnings & Payouts" subtitle="Balance, payouts and transaction history" />
      <main className="flex-1 p-4 md:p-8">
        {error && (
          <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span>{error}</span>
            <button onClick={reload} className="font-bold hover:text-red-300">Retry</button>
          </div>
        )}

        {isLoading || !data ? (
          !error && <p className="text-gray-500 text-center py-20">Loading earnings...</p>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Balance Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <p className="text-purple-200 text-sm font-medium mb-2">Available Balance</p>
                  <h2 className="text-4xl font-black text-white mb-2">{money(data.balance.availableCents)}</h2>
                  <p className="text-purple-200 text-sm mb-6">
                    {data.balance.pendingCents > 0 && <>{money(data.balance.pendingCents)} clearing · </>}
                    Earnings become available {data.balance.holdDays} {data.balance.holdDays === 1 ? "day" : "days"} after each sale
                  </p>
                  {data.hasProcessingPayout ? (
                    <div className="inline-flex items-center gap-2 bg-white/15 text-white px-5 py-3 rounded-xl font-semibold">
                      <I name="Clock" size={18} /> Payout of {money(data.balance.processingCents)} is being processed
                    </div>
                  ) : (
                    <button
                      onClick={openPayout}
                      disabled={data.balance.availableCents < data.minPayoutCents}
                      className="bg-white text-purple-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg active:scale-95 flex items-center gap-2"
                    >
                      <I name="Wallet" size={18} /> Request Payout
                    </button>
                  )}
                  {!data.hasProcessingPayout && data.balance.availableCents < data.minPayoutCents && (
                    <p className="text-purple-200 text-xs mt-3">Minimum payout is {money(data.minPayoutCents)}.</p>
                  )}
                </div>
              </div>

              {/* Payout method */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Payout method</h3>
                  <I name="CreditCard" size={18} className="text-gray-500" />
                </div>
                {data.payoutAccount ? (
                  <div className="flex-1">
                    <p className="text-white font-semibold">{PAYOUT_METHOD_LABELS[data.payoutAccount.method]}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {data.payoutAccount.bankName && <>{data.payoutAccount.bankName} · </>}
                      {data.payoutAccount.accountNumberMasked}
                    </p>
                    <p className="text-gray-500 text-sm">{data.payoutAccount.accountName}</p>
                  </div>
                ) : (
                  <p className="flex-1 text-gray-400 text-sm">Add a bank account, GCash or PayPal to receive your earnings.</p>
                )}
                <button
                  onClick={() => setModal("account")}
                  className="mt-4 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-bold hover:bg-white/10"
                >
                  {data.payoutAccount ? "Change payout method" : "Add payout method"}
                </button>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Stat label="Pending clearance" value={money(data.balance.pendingCents)} hint={`Held ${data.balance.holdDays} days for refunds`} icon="Clock" />
              <Stat label="In payout" value={money(data.balance.processingCents)} hint="Being sent to you" icon="Wallet" />
              <Stat label="Paid out" value={money(data.balance.paidOutCents)} hint="Lifetime withdrawals" icon="Check" />
              <Stat
                label="Lifetime earnings"
                value={money(data.balance.lifetimeNetCents)}
                hint={`${money(data.balance.lifetimeGrossCents)} sales − ${formatPercent(data.platformFeeRate)} fee`}
                icon="TrendingUp"
              />
            </div>

            {/* Transactions */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">Transaction History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5">
                    <tr className="text-gray-400 text-xs uppercase">
                      <th className="p-4 font-medium">Reference</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium">Description</th>
                      <th className="p-4 font-medium text-right">Amount</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <I name="Wallet" size={32} className="mx-auto text-gray-600 mb-3" />
                          <p className="text-white font-semibold">No transactions yet</p>
                          <p className="text-gray-500 text-sm mt-1">Your sales and payouts will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      data.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white font-mono font-medium whitespace-nowrap">{tx.reference}</td>
                          <td className="p-4 text-gray-300 whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              tx.type === "earning" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {tx.type === "earning" ? "Sale" : "Payout"}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">{tx.description}</td>
                          <td className={`p-4 text-right font-bold whitespace-nowrap ${tx.amountCents > 0 ? "text-green-400" : "text-white"}`}>
                            {tx.amountCents > 0 ? "+" : tx.amountCents < 0 ? "−" : ""}{money(Math.abs(tx.amountCents))}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${TX_STATUS_STYLES[tx.status]}`}>
                              {tx.status}
                            </span>
                            {tx.status === "pending" && tx.availableOn && (
                              <span className="block text-xs text-gray-500 mt-1">Available {formatDate(tx.availableOn)}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {modal === "account" && data && (
        <PayoutAccountModal
          current={data.payoutAccount}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload(); }}
        />
      )}
      {modal === "payout" && data?.payoutAccount && (
        <PayoutModal
          data={data}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); reload(); }}
        />
      )}
    </SellerDashboardLayout>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <I name={icon} size={18} className="text-gray-500" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <p className="text-gray-500 text-xs mt-1">{hint}</p>
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="alert-toast-in w-full max-w-md bg-[#0f0f17] border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <I name="X" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PayoutAccountModal({ current, onClose, onSaved }: { current: PayoutAccount | null; onClose: () => void; onSaved: () => void }) {
  const { token } = useAuth();
  const alert = useAlert();
  const [method, setMethod] = useState<PayoutMethod>(current?.method ?? "gcash");
  const [accountName, setAccountName] = useState(current?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(""); // Never prefilled — the server only has it masked
  const [bankName, setBankName] = useState(current?.bankName ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const numberLabel = method === "paypal" ? "PayPal email" : method === "gcash" ? "GCash mobile number" : "Account number";
  const numberPlaceholder = method === "paypal" ? "you@example.com" : method === "gcash" ? "09171234567" : "0012345678";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updatePayoutAccount(token!, { method, accountName, accountNumber, bankName: method === "bank" ? bankName : undefined });
      alert.success(`Payouts will be sent to your ${PAYOUT_METHOD_LABELS[method]} account.`, { title: "Payout method saved" });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={current ? "Change payout method" : "Add payout method"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMethod(m); setAccountNumber(""); setError(""); }}
              className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                method === m ? "bg-purple-600 border-purple-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {PAYOUT_METHOD_LABELS[m]}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="block text-sm text-gray-400 mb-1.5">Account holder name</span>
          <input required value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} placeholder="Full legal name" />
        </label>

        {method === "bank" && (
          <label className="block">
            <span className="block text-sm text-gray-400 mb-1.5">Bank name</span>
            <input required value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} placeholder="e.g. BDO, BPI, Metrobank" />
          </label>
        )}

        <label className="block">
          <span className="block text-sm text-gray-400 mb-1.5">{numberLabel}</span>
          <input
            required
            type={method === "paypal" ? "email" : "text"}
            inputMode={method === "paypal" ? "email" : "numeric"}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={inputClass}
            placeholder={current ? `Re-enter (currently ${current.accountNumberMasked})` : numberPlaceholder}
          />
        </label>

        <p className="text-xs text-gray-500 flex gap-1.5">
          <I name="Shield" size={14} className="shrink-0 text-green-500" />
          Make sure the name matches the account exactly — mismatched payouts can be returned.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-white/10">Cancel</button>
          <button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PayoutModal({ data, onClose, onDone }: { data: EarningsResponse; onClose: () => void; onDone: () => void }) {
  const { token } = useAuth();
  const alert = useAlert();
  const currency = data.balance.currency;
  const available = data.balance.availableCents;
  const [amount, setAmount] = useState((available / 100).toFixed(2));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const account = data.payoutAccount!;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return setError("Enter a valid amount");
    if (cents > available) return setError(`You can withdraw up to ${formatMoney(available, currency)}`);
    if (cents < data.minPayoutCents) return setError(`The minimum payout is ${formatMoney(data.minPayoutCents, currency)}`);

    setError("");
    setSubmitting(true);
    try {
      const payout = await requestPayout(token!, cents);
      alert.success(
        `${formatMoney(payout.amountCents, currency)} is on its way to ${PAYOUT_METHOD_LABELS[account.method]} ${account.accountNumberMasked}. Reference ${payout.payoutNumber}.`,
        { title: "Payout requested", duration: 7000 }
      );
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Request payout" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <label className="block">
          <span className="flex justify-between text-sm text-gray-400 mb-1.5">
            Amount
            <button type="button" onClick={() => setAmount((available / 100).toFixed(2))} className="text-purple-400 hover:text-purple-300 font-semibold">
              Max {formatMoney(available, currency)}
            </button>
          </span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min={data.minPayoutCents / 100}
              max={available / 100}
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              className={`${inputClass} pl-8 text-lg font-bold`}
            />
          </div>
        </label>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Send to</span>
            <span className="text-white text-right">
              {PAYOUT_METHOD_LABELS[account.method]} {account.accountNumberMasked}
              <span className="block text-gray-500 text-xs">{account.accountName}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Arrives in</span>
            <span className="text-white">3–5 business days</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-white/10">Cancel</button>
          <button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <I name="Wallet" size={16} /> {submitting ? "Requesting..." : "Confirm payout"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
