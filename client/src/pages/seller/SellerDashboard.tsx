import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import SellerDashboardLayout from "../../components/seller/SellerDashboardLayout";
import SellerHeader from "../../components/seller/SellerHeader";
import StatsCard from "../../components/seller/StatsCard";
import SalesChart from "../../components/seller/SalesChart";
import { I } from "../../components/Shared";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getOverview, OVERVIEW_RANGES, type Overview, type OverviewRange } from "../../api/seller";
import { assetUrl } from "../../api/products";
import { formatDate, formatMoney } from "../../utils/money";

// Signed % change; null from the API means "had nothing last period"
const formatChange = (change: number | null): { change: string; trend: "up" | "down" | "neutral" } => {
  if (change === null) return { change: "New", trend: "up" };
  if (change === 0) return { change: "0%", trend: "neutral" };
  const pct = Math.abs(change) >= 10 ? Math.round(change * 100) : +(change * 100).toFixed(1);
  return { change: `${change > 0 ? "+" : "−"}${Math.abs(pct)}%`, trend: change > 0 ? "up" : "down" };
};

export default function SellerDashboard() {
  const { token, user } = useAuth();
  const [range, setRange] = useState<OverviewRange>("30d");
  const load = useCallback(() => getOverview(token!, range), [token, range]);
  const { data, isLoading, error, reload } = useAsync(token ? `overview:${range}` : null, load);

  // Refetch keeps the frame: hold the last result (dimmed) while a new range loads
  const [shown, setShown] = useState<Overview | null>(null);
  if (data && data !== shown) setShown(data);
  const overview = data ?? shown;
  const refetching = isLoading && !!shown;

  const rangeInfo = OVERVIEW_RANGES.find((r) => r.value === range)!;
  const caption = `vs ${rangeInfo.previousLabel}`;
  const money = (cents: number) => formatMoney(cents, overview?.currency ?? "USD");

  return (
    <SellerDashboardLayout>
      <SellerHeader title="Dashboard" subtitle="How your store is performing" />
      <main className="flex-1 p-4 md:p-8">
        {/* Filters: one row, above everything they scope */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <p className="text-stone-400">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""} — here's how your store is doing.
          </p>
          <div className="flex gap-1 bg-stone-900 border border-stone-800 rounded-full p-1" role="group" aria-label="Date range">
            {OVERVIEW_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                  range === r.value ? "bg-white text-stone-900 font-medium" : "text-stone-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <span>{error}</span>
            <button onClick={reload} className="font-medium underline underline-offset-4 hover:text-red-200">Retry</button>
          </div>
        )}

        {!overview ? (
          !error && <p className="text-stone-500 text-center py-20">Loading your dashboard...</p>
        ) : (
          <div className={`transition-opacity ${refetching ? "opacity-60" : ""}`}>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                label="Earnings"
                value={money(overview.stats.earnings.valueCents)}
                icon="DollarSign"
                {...formatChange(overview.stats.earnings.change)}
                caption={caption}
              />
              <StatsCard
                label="Sales"
                value={overview.stats.sales.value.toLocaleString()}
                icon="ShoppingBag"
                {...formatChange(overview.stats.sales.change)}
                caption={caption}
              />
              <StatsCard
                label="Active products"
                value={overview.stats.products.active.toLocaleString()}
                icon="Package"
                change={`${overview.stats.products.draft} ${overview.stats.products.draft === 1 ? "draft" : "drafts"}`}
                caption={overview.stats.products.archived ? `· ${overview.stats.products.archived} archived` : undefined}
              />
              <StatsCard
                label="Available balance"
                value={money(overview.stats.balance.availableCents)}
                icon="Wallet"
                change={overview.stats.balance.pendingCents > 0 ? `${money(overview.stats.balance.pendingCents)} clearing` : "Nothing pending"}
                caption={overview.stats.balance.pendingCents > 0 ? `· ${overview.stats.balance.holdDays}-day hold` : undefined}
              />
            </div>

            {/* Chart & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2">
                <SalesChart series={overview.series} unit={overview.unit} currency={overview.currency} dimmed={refetching} />
              </div>
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold tracking-tight text-white">Top products</h3>
                <p className="text-sm text-stone-400 mb-6">By earnings, {rangeInfo.label.toLowerCase()}</p>
                {overview.topProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <I name="Package" size={28} className="mx-auto text-stone-600 mb-2" />
                    <p className="text-stone-500 text-sm mb-1">No sales in this period.</p>
                    <Link to="/seller/products" className="text-white text-sm font-medium underline decoration-stone-600 underline-offset-4 hover:decoration-white">
                      Manage products →
                    </Link>
                  </div>
                ) : (
                  <ol className="divide-y divide-stone-800">
                    {overview.topProducts.map((product, i) => (
                      <li key={product.productId} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <span className="w-4 text-stone-500 text-sm tabular-nums">{i + 1}</span>
                        {product.previewImageUrl ? (
                          <img src={assetUrl(product.previewImageUrl)} alt="" className="w-11 h-11 rounded-lg object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-stone-800 flex items-center justify-center text-stone-500">
                            <I name="Image" size={18} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{product.title}</p>
                          <p className="text-stone-500 text-xs">
                            {product.sales} {product.sales === 1 ? "sale" : "sales"}
                            {product.status !== "active" && <span className="ml-1.5 capitalize">· {product.status}</span>}
                          </p>
                        </div>
                        <span className="text-white font-medium text-sm tabular-nums">{money(product.netCents)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold tracking-tight text-white">Recent orders</h3>
                <Link to="/seller/orders" className="group text-stone-300 hover:text-white text-sm font-medium flex items-center gap-1">
                  View all <I name="ArrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              {overview.recentOrders.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-8">No orders yet — your first sale will show up here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-stone-500 text-xs border-b border-stone-800">
                        <th className="pb-3 font-medium">Order</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Product</th>
                        <th className="pb-3 font-medium text-right">You earn</th>
                        <th className="pb-3 font-medium pl-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {overview.recentOrders.map((order) => (
                        <tr key={`${order.orderId}:${order.productTitle}`} className="border-b border-stone-800/70 last:border-0 hover:bg-stone-800/40 transition-colors">
                          <td className="py-4 text-white font-mono whitespace-nowrap">{order.orderNumber}</td>
                          <td className="py-4 text-stone-400 whitespace-nowrap">{formatDate(order.paidAt)}</td>
                          <td className="py-4 text-stone-300">{order.customerName}</td>
                          <td className="py-4 text-stone-300 truncate max-w-[200px]">{order.productTitle}</td>
                          <td className="py-4 text-white font-medium text-right tabular-nums">{money(order.earningsCents)}</td>
                          <td className="py-4 pl-6">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${
                              order.status === "completed" ? "text-emerald-400" : "text-red-400"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${order.status === "completed" ? "bg-emerald-400" : "bg-red-400"}`} />
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </SellerDashboardLayout>
  );
}
