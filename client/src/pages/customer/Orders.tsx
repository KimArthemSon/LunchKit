import { useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/customer/DashboardLayout";
import { I } from "../../components/Shared";
import Breadcrumbs from "../../components/customer/Breadcrumbs";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getMyOrders } from "../../api/orders";
import { formatDate, formatMoney } from "../../utils/money";

export default function Orders() {
  const { token } = useAuth();
  const load = useCallback(() => getMyOrders(token!), [token]);
  const { data: orders, isLoading, error, reload } = useAsync(token ? "orders" : null, load);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6">
        <Breadcrumbs items={[{ label: "My Orders" }]} />
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-black">My Orders</h1>
            <p className="text-gray-500 mt-1">Receipts and order history for your purchases.</p>
          </div>
          <Link to="/library" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold">
            <I name="Download" size={16} /> Go to Downloads
          </Link>
        </div>

        {!token ? (
          <p className="text-center text-gray-500 py-20">Log in to see your orders.</p>
        ) : isLoading ? (
          <p className="text-center text-gray-500 py-20">Loading orders...</p>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100">
            <p className="font-bold text-black">Couldn't load your orders</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button onClick={reload} className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold">Try again</button>
          </div>
        ) : !orders?.length ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <I name="ShoppingBag" size={44} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-black text-black">No orders yet</h2>
            <p className="text-gray-500 mt-2 mb-6">When you buy something, your receipts will show up here.</p>
            <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Browse products</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Items</th>
                    <th className="px-5 py-3 font-semibold text-right">Total</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-mono font-bold text-black whitespace-nowrap">{order.orderNumber}</p>
                        {order.receiptNumber && <p className="font-mono text-xs text-gray-400 whitespace-nowrap">{order.receiptNumber}</p>}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatDate(order.paidAt ?? order.createdAt)}</td>
                      <td className="px-5 py-4 text-gray-700 max-w-xs">
                        <p className="truncate">{order.items.map((i) => i.title).join(", ")}</p>
                        <p className="text-xs text-gray-400">{order.items.length} {order.items.length === 1 ? "item" : "items"}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-black whitespace-nowrap">{formatMoney(order.totalCents, order.currency)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          order.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link to={`/orders/${order._id}`} className="text-purple-600 hover:text-purple-700 font-bold whitespace-nowrap">
                          View receipt →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
