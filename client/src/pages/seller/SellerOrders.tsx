import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import SellerDashboardLayout from "../../components/seller/SellerDashboardLayout";
import SellerHeader from "../../components/seller/SellerHeader";
import { I } from "../../components/Shared";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getSales, type SaleStatus } from "../../api/seller";
import { formatDateTime, formatMoney } from "../../utils/money";

const PAGE_SIZE = 20;

export default function SellerOrders() {
  const { token } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SaleStatus | "all">("all");
  const [page, setPage] = useState(1);

  const load = useCallback(
    () => getSales(token!, { search, status: status === "all" ? undefined : status, page, limit: PAGE_SIZE }),
    [token, search, status, page]
  );
  const { data, isLoading, error, reload } = useAsync(token ? `sales:${search}:${status}:${page}` : null, load);
  const currency = data?.summary.currency ?? "USD";

  const applySearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const stats = [
    { label: "Sales", value: data ? data.summary.count.toLocaleString() : "—", icon: "ShoppingBag" },
    { label: "Gross sales", value: data ? formatMoney(data.summary.grossCents, currency) : "—", icon: "DollarSign" },
    { label: "Platform fees", value: data ? `−${formatMoney(data.summary.feesCents, currency)}` : "—", icon: "Package" },
    { label: "Your earnings", value: data ? formatMoney(data.summary.netCents, currency) : "—", icon: "Wallet", highlight: true },
  ];

  return (
    <SellerDashboardLayout>
      <SellerHeader title="Orders" subtitle="Every sale of your products" />
      <main className="flex-1 p-4 md:p-8">
        {/* Totals for the current filter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-2xl p-5 border ${s.highlight ? "bg-purple-600/10 border-purple-500/30" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm font-medium">{s.label}</span>
                <I name={s.icon} size={18} className={s.highlight ? "text-purple-400" : "text-gray-500"} />
              </div>
              <div className={`text-2xl font-black ${s.highlight ? "text-purple-300" : "text-white"}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <form onSubmit={applySearch} className="relative">
            <I name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) { setSearch(""); setPage(1); }
              }}
              placeholder="Order #, customer or product"
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-72"
            />
          </form>
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {(["all", "completed", "refunded"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                  status === s ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span>{error}</span>
            <button onClick={reload} className="font-bold hover:text-red-300">Retry</button>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr className="text-gray-400 text-xs uppercase">
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium text-right">Price</th>
                  <th className="p-4 font-medium text-right">Fee</th>
                  <th className="p-4 font-medium text-right">You earn</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={8} className="p-10 text-center text-gray-500">Loading orders...</td></tr>
                ) : !data?.sales.length ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <I name="ShoppingBag" size={32} className="mx-auto text-gray-600 mb-3" />
                      <p className="text-white font-semibold">{search || status !== "all" ? "No orders match your filters" : "No sales yet"}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {search || status !== "all" ? "Try a different search or status." : "When customers buy your products, their orders show up here."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.sales.map((sale) => (
                    <tr key={`${sale.orderId}:${sale.productId}`} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-mono font-medium whitespace-nowrap">{sale.orderNumber}</td>
                      <td className="p-4 text-gray-300 whitespace-nowrap">{formatDateTime(sale.paidAt)}</td>
                      <td className="p-4">
                        <p className="text-white">{sale.customerName}</p>
                        <p className="text-gray-500 text-xs">{sale.customerEmail}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-200">{sale.productTitle}</p>
                        <p className="text-gray-500 text-xs">{sale.category}</p>
                      </td>
                      <td className="p-4 text-white text-right whitespace-nowrap">{formatMoney(sale.priceCents, currency)}</td>
                      <td className="p-4 text-gray-500 text-right whitespace-nowrap">−{formatMoney(sale.feeCents, currency)}</td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${sale.status === "refunded" ? "text-gray-500 line-through" : "text-purple-400"}`}>
                        {formatMoney(sale.earningsCents, currency)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          sale.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm">
              <span className="text-gray-400">
                Page {data.page} of {data.totalPages} · {data.total} orders
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </SellerDashboardLayout>
  );
}
