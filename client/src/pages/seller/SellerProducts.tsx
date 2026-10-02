import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SellerDashboardLayout from "../../components/seller/SellerDashboardLayout";
import SellerHeader from "../../components/seller/SellerHeader";
import ProductFormModal from "../../components/seller/ProductFormModal";
import StatusSelect from "../../components/seller/StatusSelect";
import { I } from "../../components/Shared";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import {
  getMyProducts, createProduct, updateProduct, deleteProduct, assetUrl,
  PRODUCT_STATUSES, type Product, type ProductInput, type ProductStatus,
} from "../../api/products";

export default function SellerProducts() {
  const { token } = useAuth();
  const alert = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  // undefined = modal closed, null = creating, Product = editing
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  // The sidebar's "New product" button links to ?new=1, which opens the create form directly
  const [searchParams, setSearchParams] = useSearchParams();
  const creatingFromUrl = searchParams.get("new") === "1";
  const modalProduct = editing !== undefined ? editing : creatingFromUrl ? null : undefined;
  const closeModal = () => {
    setEditing(undefined);
    if (creatingFromUrl) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      }, { replace: true });
    }
  };

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setProducts(await getMyProducts(token));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (statusFilter === "all" || p.status === statusFilter) &&
        (!q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    );
  }, [products, search, statusFilter]);

  const handleSubmit = async (input: ProductInput) => {
    if (editing) {
      const updated = await updateProduct(token, editing._id, input);
      setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      alert.success(`"${updated.title}" was updated.`, { title: "Product updated" });
    } else {
      const created = await createProduct(token, input);
      setProducts((prev) => [created, ...prev]);
      alert.success(
        created.status === "active" ? `"${created.title}" is now live.` : `"${created.title}" was saved as ${created.status}.`,
        { title: "Product created" }
      );
    }
    closeModal();
  };

  // Inline status change from the table — optimistic, rolled back if the save fails
  const [savingStatus, setSavingStatus] = useState<Set<string>>(new Set());
  const STATUS_MESSAGES: Record<ProductStatus, string> = {
    active: "is now live in the store.",
    draft: "was moved to drafts and is hidden from the store.",
    archived: "was archived. It's hidden from the store, and buyers keep their downloads.",
  };

  const handleStatusChange = async (product: Product, status: ProductStatus) => {
    if (status === product.status || savingStatus.has(product._id)) return;
    const previous = product.status;
    setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...p, status } : p)));
    setSavingStatus((s) => new Set(s).add(product._id));
    try {
      const updated = await updateProduct(token, product._id, { status });
      setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      alert.success(`"${updated.title}" ${STATUS_MESSAGES[status]}`, { title: "Status updated" });
    } catch (err: any) {
      setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...p, status: previous } : p)));
      alert.error(err.message, { title: "Couldn't change status" });
    } finally {
      setSavingStatus((s) => {
        const next = new Set(s);
        next.delete(product._id);
        return next;
      });
    }
  };

  const handleDelete = async (product: Product) => {
    const ok = await alert.confirm({
      title: "Delete product?",
      message: `"${product.title}" and its uploaded files will be permanently deleted. This cannot be undone.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(token, product._id);
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      alert.success(`"${product.title}" was deleted.`, { title: "Product deleted" });
    } catch (err: any) {
      alert.error(err.message, { title: "Couldn't delete product" });
    }
  };

  return (
    <SellerDashboardLayout>
      <SellerHeader title="My Products" subtitle="Listings, prices and store visibility" />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <I name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-64"
              />
            </div>
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              {(["all", ...PRODUCT_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                    statusFilter === s ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setEditing(null)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-purple-500/30"
          >
            <I name="Plus" size={18} /> Add Product
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span>{error}</span>
            <button onClick={loadProducts} className="font-bold hover:text-red-300">Retry</button>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr className="text-gray-400 text-xs uppercase">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Downloads</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-10 text-center text-gray-500">Loading products...</td></tr>
                ) : visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-500">
                      {products.length === 0 ? "You haven't listed any products yet." : "No products match your filters."}
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.previewImageUrl ? (
                            <img src={assetUrl(product.previewImageUrl)} alt={product.title} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-gray-500">
                              <I name="Image" size={18} />
                            </div>
                          )}
                          <span className="text-white font-medium">{product.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{product.category}</td>
                      <td className="p-4 text-white font-semibold">${product.price.toFixed(2)}</td>
                      <td className="p-4 text-gray-300">{product.downloadsCount}</td>
                      <td className="p-4">
                        <StatusSelect
                          value={product.status}
                          onChange={(status) => handleStatusChange(product, status)}
                          saving={savingStatus.has(product._id)}
                          label={`Status for ${product.title}`}
                        />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditing(product)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <I name="Edit" size={16} />
                          </button>
                          <button onClick={() => handleDelete(product)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                            <I name="Trash2" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {modalProduct !== undefined && (
        <ProductFormModal product={modalProduct} onClose={closeModal} onSubmit={handleSubmit} />
      )}
    </SellerDashboardLayout>
  );
}
