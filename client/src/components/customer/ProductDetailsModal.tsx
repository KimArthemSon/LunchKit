import { useEffect } from "react";
import { I } from "../Shared";
import AddToCartButton from "./AddToCartButton";
import { useProduct } from "../../hooks/useProducts";
import { assetUrl, formatFileSize, isNewProduct, sellerName, type Product } from "../../api/products";

interface Props {
  productId: string;
  initial?: Product | null; // Shown instantly while the latest copy loads
  onClose: () => void;
}

export default function ProductDetailsModal({ productId, initial, onClose }: Props) {
  const { product, isLoading, error } = useProduct(productId, initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const seller = product ? sellerName(product) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="alert-toast-in relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-black shadow-md"
        >
          <I name="X" size={18} />
        </button>

        {!product ? (
          <div className="p-16 text-center">
            {isLoading ? (
              <p className="text-gray-500">Loading product...</p>
            ) : (
              <>
                <I name="Package" size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="font-bold text-black">Product not available</p>
                <p className="text-sm text-gray-500 mt-1">{error || "It may have been removed by the seller."}</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2">
            <div className="relative bg-gray-100 aspect-[4/3] md:aspect-auto md:min-h-[420px]">
              {product.previewImageUrl ? (
                <img src={assetUrl(product.previewImageUrl)} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <I name="Image" size={64} />
                </div>
              )}
              {isNewProduct(product) && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                  New
                </span>
              )}
            </div>

            <div className="p-6 md:p-8 flex flex-col">
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">{product.category}</span>
              <h2 className="text-2xl md:text-3xl font-black text-black mt-1">{product.title}</h2>
              {seller && <p className="text-sm text-gray-500 mt-1">by <span className="font-semibold text-gray-700">{seller}</span></p>}

              <p className="mt-5 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {product.description || "No description provided."}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Format", product.fileType?.toUpperCase() || "—"],
                  ["File size", formatFileSize(product.fileSize) || "—"],
                  ["Downloads", product.downloadsCount.toLocaleString()],
                  ["Published", new Date(product.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })],
                ].map(([label, value]) => (
                  <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="font-bold text-black mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto pt-6 flex items-center justify-between gap-4">
                <span className="text-3xl font-black text-black">
                  {product.price === 0 ? "Free" : `$${product.price.toFixed(2)}`}
                </span>
                <AddToCartButton product={product} size="lg" onDone={onClose} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
