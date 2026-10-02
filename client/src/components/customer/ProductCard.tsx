import { I } from "../Shared";
import AddToCartButton from "./AddToCartButton";
import { assetUrl, isNewProduct, sellerName, type Product } from "../../api/products";

interface ProductCardProps {
  product: Product;
  onView?: (product: Product) => void;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export default function ProductCard({ product, onView }: ProductCardProps) {
  const seller = sellerName(product);
  const isFree = product.price === 0;

  return (
    <article
      onClick={() => onView?.(product)}
      onKeyDown={(e) => {
        if (onView && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onView(product); }
      }}
      tabIndex={onView ? 0 : undefined}
      aria-label={onView ? `View ${product.title}` : undefined}
      className={`group relative bg-white rounded-2xl border border-stone-200 p-2 flex flex-col transition-colors duration-300 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${onView ? "cursor-pointer" : ""}`}
    >
      {/* Preview */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
        {product.previewImageUrl ? (
          <img
            src={assetUrl(product.previewImageUrl)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <I name="Image" size={40} />
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
          {isNewProduct(product) ? (
            <span className="px-2 py-0.5 rounded-full bg-white text-stone-900 text-[11px] font-medium">New</span>
          ) : <span />}
          {product.fileType && (
            <span className="px-2 py-0.5 rounded-full bg-stone-900/70 backdrop-blur text-white text-[10px] font-medium uppercase tracking-wide">
              {product.fileType}
            </span>
          )}
        </div>

        {/* Quick view affordance */}
        {onView && (
          <div className="absolute inset-0 flex items-end justify-center p-3 bg-stone-900/10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-stone-900 text-xs font-medium">
              <I name="Eye" size={14} /> Quick view
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="px-2 pt-3 pb-1 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          {product.category}
        </div>
        <h3 className="mt-1 text-[15px] font-medium leading-snug text-stone-900 line-clamp-2 min-h-[2.6em]">
          {product.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 min-w-0">
          {seller && (
            <>
              <span className="w-5 h-5 shrink-0 rounded-full bg-stone-200 text-stone-700 text-[10px] font-semibold flex items-center justify-center">
                {seller.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{seller}</span>
            </>
          )}
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 tabular-nums" title={`${product.downloadsCount} downloads`}>
            <I name="Download" size={12} /> {compact.format(product.downloadsCount)}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <span className={`text-lg font-semibold tabular-nums ${isFree ? "text-emerald-700" : "text-stone-900"}`}>
            {isFree ? "Free" : `$${product.price.toFixed(2)}`}
          </span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-2 animate-pulse" aria-hidden="true">
      <div className="aspect-[4/3] rounded-xl bg-stone-200" />
      <div className="px-2 pt-3 pb-1 space-y-2.5">
        <div className="h-2.5 w-16 bg-stone-200 rounded" />
        <div className="h-4 w-4/5 bg-stone-200 rounded" />
        <div className="h-3 w-1/2 bg-stone-100 rounded" />
        <div className="h-9 w-full bg-stone-100 rounded-full mt-3" />
      </div>
    </div>
  );
}
