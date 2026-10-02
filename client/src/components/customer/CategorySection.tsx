import type { ReactNode } from "react";
import type { Product } from "../../api/products";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";
import { I } from "../Shared";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

// Consistent heading for every storefront section: title, optional subtitle and action
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.03em] text-stone-900">{title}</h2>
        {subtitle && <p className="text-sm text-stone-500 truncate mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SeeAllButton({ onClick, label = "See all" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-stone-900 group"
    >
      {label}
      <I name="ArrowRight" size={16} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  onSeeMore?: () => void;
  onView?: (product: Product) => void;
  isLoading?: boolean;
}

export default function CategorySection({
  title,
  subtitle,
  products,
  onSeeMore,
  onView,
  isLoading = false,
}: CategorySectionProps) {
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="mb-16">
      <SectionHeader title={title} subtitle={subtitle} action={onSeeMore && <SeeAllButton onClick={onSeeMore} />} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
          : products.map((product) => (
              <ProductCard key={product._id} product={product} onView={onView} />
            ))}
      </div>
    </section>
  );
}
