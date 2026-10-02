import { useCallback, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/customer/DashboardLayout";
import CategorySection, { SectionHeader } from "../../components/customer/CategorySection";
import ProductCard, { ProductCardSkeleton } from "../../components/customer/ProductCard";
import ProductDetailsModal from "../../components/customer/ProductDetailsModal";
import { CATEGORY_META } from "../../components/customer/categoryMeta";
import { I } from "../../components/Shared";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useProductBrowse, useProductFeed } from "../../hooks/useProducts";
import { formatMoney } from "../../utils/money";
import {
  PRODUCT_CATEGORIES, assetUrl,
  type Product, type ProductCategory, type ProductSort,
} from "../../api/products";

type CategoryTab = "All" | ProductCategory;

const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  popular: "Most downloaded",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const POPULAR_SEARCHES = ["iPhone mockup", "Pitch deck", "Lower thirds", "Icons", "Launch kit"];

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search")?.trim() ?? "";
  const viewingId = searchParams.get("product");

  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>("All");
  const [sort, setSort] = useState<ProductSort | undefined>(undefined);
  const [viewingInitial, setViewingInitial] = useState<Product | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const allProductsRef = useRef<HTMLElement>(null);

  const { feed, isLoading: feedLoading, error: feedError, reload: reloadFeed } = useProductFeed();
  const browse = useProductBrowse({
    search,
    category: selectedCategory === "All" ? undefined : selectedCategory,
    sort,
  });

  const isFiltering = selectedCategory !== "All" || !!search;
  const firstName = user?.name?.split(" ")[0];
  const bundles = feed?.byCategory.Bundles ?? [];
  const storefrontEmpty = !feedLoading && !feedError && feed?.total === 0;

  const updateParams = useCallback((change: (p: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      change(next);
      return next;
    });
  }, [setSearchParams]);

  // Product details live in the URL (?product=<id>) so they're shareable and Back closes them
  const openProduct = useCallback((product: Product) => {
    setViewingInitial(product);
    updateParams((p) => p.set("product", product._id));
  }, [updateParams]);

  const closeProduct = useCallback(() => {
    updateParams((p) => p.delete("product"));
    setViewingInitial(null);
  }, [updateParams]);

  const runSearch = (q: string) => {
    updateParams((p) => (q.trim() ? p.set("search", q.trim()) : p.delete("search")));
    scrollTo(filterBarRef.current);
  };

  const clearFilters = () => {
    setSelectedCategory("All");
    updateParams((p) => p.delete("search"));
  };

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "start" });

  const showCategory = (category: CategoryTab) => {
    setSelectedCategory(category);
    scrollTo(filterBarRef.current);
  };

  const showAllSortedBy = (nextSort: ProductSort | undefined) => {
    setSort(nextSort);
    scrollTo(allProductsRef.current);
  };

  const productGrid = (
    <>
      {browse.error ? (
        <ErrorState message={browse.error} onRetry={browse.reload} />
      ) : browse.isLoading ? (
        <Grid>{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</Grid>
      ) : browse.products.length === 0 ? (
        <EmptyState
          icon="Search"
          title="No products found"
          body={search ? `Nothing matches “${search}”. Try a broader term or another category.` : "Nothing in this category yet — check back soon."}
          action={<button onClick={clearFilters} className="px-5 py-2.5 rounded-full bg-stone-900 hover:bg-stone-700 text-white text-sm font-medium transition-colors">Clear filters</button>}
        />
      ) : (
        <Grid>{browse.products.map((p) => <ProductCard key={p._id} product={p} onView={openProduct} />)}</Grid>
      )}
      {browse.hasMore && (
        <div className="flex flex-col items-center gap-2 mt-10">
          <button
            onClick={browse.loadMore}
            disabled={browse.isLoadingMore}
            className="px-7 py-3 rounded-full bg-white border border-stone-300 text-stone-900 font-medium hover:border-stone-900 disabled:opacity-50 transition-colors"
          >
            {browse.isLoadingMore ? "Loading..." : "Load more"}
          </button>
          <span className="text-xs text-stone-500 tabular-nums">Showing {browse.products.length} of {browse.total}</span>
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Hero: search-first, plus the user's own activity ── */}
        <section className="grid lg:grid-cols-[1fr_320px] gap-10 lg:gap-16 items-start pt-6 md:pt-10 mb-12">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-stone-500 mb-4">Welcome back{firstName ? `, ${firstName}` : ""}</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-stone-900">
              Make your project look launch-ready.
            </h1>
            <p className="text-lg text-stone-600 mt-4 mb-8 leading-relaxed">
              Mockups, pitch decks and demo-video assets made by creators, for developers.
              {feed && feed.total > 0 && <> <span className="text-stone-900 font-medium tabular-nums">{feed.total.toLocaleString()}</span> assets available.</>}
            </p>

            <HeroSearch initial={search} onSearch={runSearch} />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-sm">
              <span className="text-stone-500">Popular</span>
              {POPULAR_SEARCHES.map((q) => (
                <button
                  key={q}
                  onClick={() => runSearch(q)}
                  className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-stone-900 hover:decoration-stone-900 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <ActivityPanel onBrowse={() => showAllSortedBy("popular")} />
        </section>

        {/* ── Trust strip ── */}
        {/* Hidden on phones so products start within the first screen */}
        <ul className="hidden md:grid grid-cols-3 border-y border-stone-200 mb-10">
          {[
            { icon: "Zap", title: "Instant download", body: "Files are ready the moment you pay" },
            { icon: "Download", title: "Lifetime access", body: "Re-download anytime from your library" },
            { icon: "Shield", title: "Secure checkout", body: "Card details never touch our servers" },
          ].map((t, i) => (
            <li key={t.title} className={`flex items-center gap-3 py-5 ${i > 0 ? "pl-6 border-l border-stone-200" : ""}`}>
              <span className="text-stone-900 shrink-0"><I name={t.icon} size={18} /></span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">{t.title}</p>
                <p className="text-xs text-stone-500 truncate">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* ── Sticky filter bar: categories + sort, always within reach ── */}
        <div
          ref={filterBarRef}
          className="sticky top-[73px] z-30 -mx-6 px-6 py-3 mb-10 bg-[#f7f6f3]/90 backdrop-blur-md border-b border-stone-200 scroll-mt-[73px] print:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Categories">
              {(["All", ...PRODUCT_CATEGORIES] as CategoryTab[]).map((cat) => {
                const active = selectedCategory === cat;
                const count = cat === "All" ? feed?.total : feed?.categoryCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {cat}
                    {count !== undefined && (
                      <span className="text-xs tabular-nums text-stone-400">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <label className="shrink-0 hidden sm:flex items-center gap-2 text-sm text-stone-500">
              <span className="hidden md:inline">Sort</span>
              <select
                value={sort ?? ""}
                onChange={(e) => setSort((e.target.value || undefined) as ProductSort | undefined)}
                className="pl-4 pr-3 py-2 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-800 hover:border-stone-400 focus:outline-none focus:border-stone-900"
              >
                <option value="">{search ? "Best match" : "Newest"}</option>
                {(Object.keys(SORT_LABELS) as ProductSort[])
                  .filter((s) => s !== "newest" || !!search)
                  .map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
              </select>
            </label>
          </div>
        </div>

        {isFiltering ? (
          /* ── Filtered / search results ── */
          <section>
            <SectionHeader
              title={search ? `Results for “${search}”` : selectedCategory}
              subtitle={
                browse.isLoading
                  ? "Searching..."
                  : `${browse.total} ${browse.total === 1 ? "item" : "items"}${search && selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}${
                      !search && selectedCategory !== "All" ? ` · ${CATEGORY_META[selectedCategory].blurb}` : ""
                    }`
              }
              action={
                <button onClick={clearFilters} className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900">
                  <I name="X" size={14} /> Clear
                </button>
              }
            />
            {productGrid}
          </section>
        ) : feedError ? (
          <ErrorState message={feedError} onRetry={() => { reloadFeed(); browse.reload(); }} />
        ) : storefrontEmpty ? (
          <EmptyState icon="Package" title="The shelves are being stocked" body="No products are live yet. Check back soon!" />
        ) : (
          <>
            <CategorySection
              title="Trending now"
              subtitle="Most downloaded by the community"
              products={feed?.trending ?? []}
              isLoading={feedLoading}
              onView={openProduct}
              onSeeMore={() => showAllSortedBy("popular")}
            />

            {/* ── Browse by category ── */}
            <section className="mb-16">
              <SectionHeader title="Browse by category" subtitle="Everything you need to present your project" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {PRODUCT_CATEGORIES.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => showCategory(cat)}
                      className="group text-left p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-400 transition-colors"
                    >
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-stone-100 text-stone-800 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                        <I name={meta.icon} size={20} />
                      </span>
                      <p className="mt-6 font-semibold text-stone-900 flex items-center justify-between">
                        {cat}
                        <I name="ArrowRight" size={16} className="text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all" />
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {meta.blurb} · <span className="tabular-nums">{feed?.categoryCounts[cat] ?? 0}</span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <CategorySection
              title="New arrivals"
              subtitle="Fresh from creators this month"
              products={feed?.newArrivals ?? []}
              isLoading={feedLoading}
              onView={openProduct}
              onSeeMore={() => showAllSortedBy(undefined)}
            />

            {bundles.length > 0 && <BundleSpotlight bundles={bundles} onView={openProduct} onSeeAll={() => showCategory("Bundles")} />}

            {/* ── All Products ── */}
            <section ref={allProductsRef} className="scroll-mt-40">
              <SectionHeader
                title="All products"
                subtitle={browse.isLoading ? "Loading..." : `${browse.total} items · sorted by ${sort ? SORT_LABELS[sort].toLowerCase() : "newest"}`}
              />
              {productGrid}
            </section>
          </>
        )}
      </div>

      {viewingId && (
        <ProductDetailsModal
          key={viewingId}
          productId={viewingId}
          initial={viewingInitial?._id === viewingId ? viewingInitial : null}
          onClose={closeProduct}
        />
      )}
    </DashboardLayout>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{children}</div>;
}

function HeroSearch({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(initial);
  // Follow external changes (header search, "Clear")
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setValue(initial);
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form onSubmit={submit} role="search" className="flex items-center gap-2 p-1.5 rounded-full bg-white border border-stone-300 focus-within:border-stone-900 focus-within:ring-4 focus-within:ring-stone-900/5 transition-[border-color,box-shadow] max-w-xl">
      <I name="Search" size={18} className="ml-3.5 text-stone-400 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search mockups, decks, overlays..."
        aria-label="Search products"
        className="flex-1 min-w-0 py-2.5 bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <button type="submit" className="shrink-0 px-5 py-2.5 rounded-full bg-stone-900 hover:bg-stone-700 text-white text-sm font-medium transition-colors">
        Search
      </button>
    </form>
  );
}

function ActivityPanel({ onBrowse }: { onBrowse: () => void }) {
  const { cartCount, summary, ownedCount, setIsCartOpen } = useCart();

  const rows: { icon: string; label: string; detail: string; onClick?: () => void; to?: string; highlight?: boolean }[] = [
    {
      icon: "ShoppingBag",
      label: "Cart",
      detail: cartCount ? `${cartCount} ${cartCount === 1 ? "item" : "items"} · ${formatMoney(summary.totalCents, summary.currency)}` : "Empty",
      onClick: () => setIsCartOpen(true),
      highlight: cartCount > 0,
    },
    { icon: "Download", label: "Downloads", detail: `${ownedCount} ${ownedCount === 1 ? "product" : "products"} owned`, to: "/library" },
    { icon: "FileText", label: "Orders & receipts", detail: "View purchase history", to: "/orders" },
  ];

  return (
    // Desktop only — on smaller screens the header already gives cart, downloads and orders
    <aside className="hidden lg:flex rounded-2xl bg-white border border-stone-200 p-5 flex-col">
      <h2 className="text-sm font-medium text-stone-500 mb-3">Your activity</h2>
      <ul className="space-y-2 flex-1">
        {rows.map((r) => {
          const content = (
            <>
              <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${r.highlight ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}>
                <I name={r.icon} size={18} />
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-medium text-stone-900">{r.label}</span>
                <span className="block text-xs text-stone-500 truncate tabular-nums">{r.detail}</span>
              </span>
              <I name="ArrowRight" size={16} className="text-stone-300 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all" />
            </>
          );
          const cls = "group w-full flex items-center gap-3 p-2.5 -mx-1 rounded-xl hover:bg-stone-50 transition-colors";
          return (
            <li key={r.label}>
              {r.to ? <Link to={r.to} className={cls}>{content}</Link> : <button onClick={r.onClick} className={cls}>{content}</button>}
            </li>
          );
        })}
      </ul>
      {cartCount > 0 ? (
        <Link
          to="/checkout"
          className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-stone-900 hover:bg-stone-700 text-white text-sm font-medium transition-colors"
        >
          <I name="Shield" size={15} /> Checkout
        </Link>
      ) : (
        // Empty cart: offer a next step instead of leaving a blank gap
        <button
          onClick={onBrowse}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-stone-300 text-stone-800 hover:border-stone-900 hover:text-stone-900 text-sm font-medium transition-colors"
        >
          <I name="Flame" size={15} /> Browse best sellers
        </button>
      )}
    </aside>
  );
}

function BundleSpotlight({ bundles, onView, onSeeAll }: { bundles: Product[]; onView: (p: Product) => void; onSeeAll: () => void }) {
  const [featured, ...rest] = bundles;
  return (
    <section className="mb-16 rounded-2xl bg-stone-950 p-7 md:p-10">
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <p className="text-sm font-medium text-stone-400">Bundle deal</p>
          <h3 className="mt-3 text-2xl md:text-3xl font-semibold text-white tracking-[-0.03em]">{featured!.title}</h3>
          <p className="mt-2 text-stone-400 max-w-xl line-clamp-2">{featured!.description || "More assets for one price."}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onView(featured!)}
              className="px-5 py-2.5 rounded-full bg-white text-stone-900 hover:bg-stone-200 text-sm font-medium transition-colors tabular-nums"
            >
              View bundle · {featured!.price === 0 ? "Free" : `$${featured!.price.toFixed(2)}`}
            </button>
            {rest.length > 0 && <SeeAllButtonDark onClick={onSeeAll} count={bundles.length} />}
          </div>
        </div>
        <div className="flex -space-x-6">
          {bundles.slice(0, 3).map((b, i) => (
            // Outer div holds the fan rotation so the button's hover lift isn't overridden
            <div key={b._id} style={{ transform: `rotate(${(i - 1) * 4}deg)` }}>
              <button
                onClick={() => onView(b)}
                aria-label={`View ${b.title}`}
                className="block w-28 h-24 md:w-36 md:h-28 rounded-xl overflow-hidden ring-4 ring-stone-950 bg-stone-800 hover:-translate-y-1.5 transition-transform"
              >
                {b.previewImageUrl ? (
                  <img src={assetUrl(b.previewImageUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-stone-500"><I name="Package" size={28} /></span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeeAllButtonDark({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-300 hover:text-white group">
      All {count} bundles <I name="ArrowRight" size={15} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-stone-300">
      <span className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mb-4">
        <I name={icon} size={26} />
      </span>
      <p className="text-lg font-semibold text-stone-900">{title}</p>
      <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="AlertTriangle"
      title="Couldn't load products"
      body={message}
      action={<button onClick={onRetry} className="px-5 py-2.5 rounded-full bg-stone-900 hover:bg-stone-700 text-white text-sm font-medium transition-colors">Try again</button>}
    />
  );
}

