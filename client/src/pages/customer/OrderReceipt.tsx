import { useCallback } from "react";
import type { ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/customer/DashboardLayout";
import BillSummary from "../../components/customer/BillSummary";
import DownloadButton from "../../components/customer/DownloadButton";
import { I } from "../../components/Shared";
import Breadcrumbs from "../../components/customer/Breadcrumbs";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getOrder, type Order } from "../../api/orders";
import { assetUrl, formatFileSize } from "../../api/products";
import { BRAND_LABELS } from "../../utils/card";
import { formatDateTime, formatMoney } from "../../utils/money";
import { LogoMark } from "../../components/Logo";

const STATUS_STYLES: Record<Order["status"], string> = {
  paid: "bg-green-100 text-green-700",
  refunded: "bg-gray-100 text-gray-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const paymentMethodLabel = (order: Order) => {
  const p = order.payment;
  if (!p) return "—";
  if (p.provider === "free") return "No payment required (free)";
  return `${BRAND_LABELS[p.brand ?? "card"] ?? "Card"} •••• ${p.last4 ?? "????"}`;
};

export default function OrderReceipt() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";
  const { token } = useAuth();

  const load = useCallback(() => getOrder(token!, id), [token, id]);
  const { data: order, isLoading, error } = useAsync(token ? `order:${id}` : null, load);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6 print:hidden">
          <Breadcrumbs items={[{ label: "My Orders", to: "/orders" }, { label: order?.orderNumber ?? "Receipt" }]} />
          {order && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-black hover:border-purple-500"
            >
              <I name="FileText" size={16} /> Print / Save as PDF
            </button>
          )}
        </div>

        {!token ? (
          <Message title="Log in to view this receipt" />
        ) : isLoading ? (
          <p className="text-center text-gray-500 py-20">Loading receipt...</p>
        ) : !order ? (
          <Message title="Receipt not found" body={error || "This order doesn't exist or belongs to another account."} />
        ) : (
          <>
            {justPlaced && order.status === "paid" && (
              <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white print:hidden">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <I name="Check" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black">Thank you for your purchase!</h1>
                    <p className="text-purple-100 mt-1">
                      Your files are ready to download below and in your library. A copy of this receipt was sent to{" "}
                      <strong>{order.billing.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Receipt document ── */}
            <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 print:shadow-none print:border-0 print:p-0">
              <header className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <LogoMark size={40} />
                  <div>
                    <p className="text-xl font-black text-black leading-tight">LaunchKit</p>
                    <p className="text-xs text-gray-500">Marketing-in-a-Box for developers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-black">Receipt</p>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </header>

              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 py-6 border-b border-gray-100 text-sm">
                <Meta label="Receipt number" value={order.receiptNumber ?? "—"} mono />
                <Meta label="Order number" value={order.orderNumber} mono />
                <Meta label="Date paid" value={formatDateTime(order.paidAt ?? order.createdAt)} />
                <Meta label="Payment method" value={paymentMethodLabel(order)} />
                <Meta label="Billed to" value={<>{order.billing.name}<br /><span className="text-gray-500">{order.billing.email}</span></>} />
                {order.payment?.transactionId && <Meta label="Transaction ID" value={order.payment.transactionId} mono small />}
              </dl>

              <table className="w-full text-sm mt-6">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-semibold">Item</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <tr key={String(item.productId)}>
                      <td className="py-4 pr-4">
                        <p className="font-bold text-black">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.category}
                          {typeof item.sellerId === "object" && ` · Sold by ${item.sellerId.name}`}
                          {" · "}Digital download, single-user license
                        </p>
                      </td>
                      <td className="py-4 text-right font-semibold text-black whitespace-nowrap align-top">
                        {formatMoney(item.unitPriceCents, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 sm:ml-auto sm:max-w-xs">
                <BillSummary
                  subtotalCents={order.subtotalCents}
                  taxRate={order.taxRate}
                  taxCents={order.taxCents}
                  totalCents={order.totalCents}
                  currency={order.currency}
                  totalLabel={order.status === "paid" ? "Amount paid" : "Total"}
                />
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                <p>Thank you for supporting independent creators on LaunchKit.</p>
                <p>Questions about this order? Contact support and quote order {order.orderNumber}.</p>
              </footer>
            </article>

            {/* ── Downloads (not part of the printed receipt) ── */}
            {order.status === "paid" && (
              <section className="mt-8 print:hidden">
                <h2 className="text-xl font-black text-black mb-4">Your downloads</h2>
                <ul className="space-y-3">
                  {order.items.map((item) => (
                    <li key={String(item.productId)} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                      {item.previewImageUrl ? (
                        <img src={assetUrl(item.previewImageUrl)} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><I name="Package" size={22} /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-black truncate">{item.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.fileName}{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ""}
                        </p>
                      </div>
                      <DownloadButton productId={String(item.productId)} fileName={item.fileName} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Meta({ label, value, mono, small }: { label: string; value: ReactNode; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`text-black font-semibold mt-0.5 break-all ${mono ? "font-mono" : ""} ${small ? "text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Message({ title, body }: { title: string; body?: string }) {
  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
      <I name="FileText" size={44} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-2xl font-black text-black">{title}</h2>
      {body && <p className="text-gray-500 mt-2">{body}</p>}
    </div>
  );
}
