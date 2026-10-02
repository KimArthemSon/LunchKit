import { useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/customer/DashboardLayout";
import DownloadButton from "../../components/customer/DownloadButton";
import { I } from "../../components/Shared";
import Breadcrumbs from "../../components/customer/Breadcrumbs";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getLibrary } from "../../api/orders";
import { assetUrl, formatFileSize } from "../../api/products";
import { formatDate } from "../../utils/money";

export default function Library() {
  const { token } = useAuth();
  const load = useCallback(() => getLibrary(token!), [token]);
  const { data: items, isLoading, error, reload } = useAsync(token ? "library" : null, load);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-6">
        <Breadcrumbs items={[{ label: "Downloads" }]} />
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-black">Downloads</h1>
          <p className="text-gray-500 mt-1">Everything you own — download it any time, as often as you need.</p>
        </div>

        {!token ? (
          <p className="text-center text-gray-500 py-20">Log in to see your downloads.</p>
        ) : isLoading ? (
          <p className="text-center text-gray-500 py-20">Loading your library...</p>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100">
            <p className="font-bold text-black">Couldn't load your library</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button onClick={reload} className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold">Try again</button>
          </div>
        ) : !items?.length ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <I name="Download" size={44} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-black text-black">Nothing here yet</h2>
            <p className="text-gray-500 mt-2 mb-6">Products you buy will appear here for instant download.</p>
            <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Browse products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={String(item.productId)} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
                <div className="aspect-[4/3] bg-gray-100">
                  {item.previewImageUrl ? (
                    <img src={assetUrl(item.previewImageUrl)} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><I name="Image" size={48} /></div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">{item.category}</span>
                  <h3 className="font-bold text-black mt-1 line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {item.fileType?.toUpperCase()}{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Purchased {formatDate(item.purchasedAt)} ·{" "}
                    <Link to={`/orders/${item.orderId}`} className="hover:text-purple-600 underline">{item.orderNumber}</Link>
                  </p>
                  <div className="mt-auto pt-4">
                    {item.available ? (
                      <DownloadButton productId={String(item.productId)} fileName={item.fileName} className="w-full" />
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-2">No longer available from the seller</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
