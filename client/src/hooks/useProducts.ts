import { useCallback, useEffect, useState } from "react";
import {
  browseProducts, getProduct, getProductFeed,
  type Product, type ProductCategory, type ProductFeed, type ProductSort,
} from "../api/products";

// Each hook tags its result with the request key it belongs to; "loading" simply means
// the latest finished request isn't the one we currently want. Effects then only set
// state when a response arrives, and stale responses are ignored.

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

// Dashboard sections (trending, new arrivals, per-category) in one request
export function useProductFeed() {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: number; feed: ProductFeed | null; error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProductFeed()
      .then((feed) => !cancelled && setResult({ key: reloadKey, feed, error: "" }))
      .catch((err) => !cancelled && setResult((prev) => ({ key: reloadKey, feed: prev?.feed ?? null, error: errorMessage(err) })));
    return () => { cancelled = true; };
  }, [reloadKey]);

  const isLoading = result?.key !== reloadKey;
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return {
    feed: result?.feed ?? null,
    error: isLoading ? "" : result?.error ?? "",
    isLoading,
    reload,
  };
}

interface BrowseOptions {
  search?: string;
  category?: ProductCategory;
  sort?: ProductSort;
  limit?: number;
}

interface BrowseResult {
  key: string;
  page: number;
  products: Product[];
  total: number;
  totalPages: number;
  error: string;
}

// Paginated active-product listing with "load more"; resets when filters change
export function useProductBrowse({ search, category, sort, limit = 12 }: BrowseOptions) {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<BrowseResult | null>(null);

  // Back to page 1 whenever the filters change (adjusted during render to avoid a double fetch)
  const filtersKey = `${search ?? ""}|${category ?? ""}|${sort ?? ""}|${limit}|${reloadKey}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }
  const requestKey = `${filtersKey}#${page}`;

  useEffect(() => {
    let cancelled = false;
    browseProducts({ search: search || undefined, category, sort, page, limit })
      .then((res) => {
        if (cancelled) return;
        setResult((prev) => ({
          key: requestKey,
          page,
          // Append for "load more", replace for a fresh first page
          products: page === 1 || !prev ? res.products : [...prev.products, ...res.products],
          total: res.total,
          totalPages: res.totalPages,
          error: "",
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setResult((prev) => ({
          key: requestKey,
          page,
          products: page === 1 ? [] : prev?.products ?? [],
          total: prev?.total ?? 0,
          totalPages: prev?.totalPages ?? 0,
          error: errorMessage(err),
        }));
      });
    return () => { cancelled = true; };
  }, [search, category, sort, page, limit, requestKey]);

  const isLoading = result?.key !== requestKey;
  // While a new filter's first page loads, don't show the previous filter's products
  const showingStale = isLoading && page === 1;
  const hasMore = !!result && !result.error && result.page < result.totalPages;

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) setPage((p) => p + 1);
  }, [isLoading, hasMore]);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    products: showingStale ? [] : result?.products ?? [],
    total: result?.total ?? 0,
    hasMore,
    error: isLoading ? "" : result?.error ?? "",
    isLoading: showingStale,
    isLoadingMore: isLoading && page > 1,
    loadMore,
    reload,
  };
}

// Single product by id; shows `initial` (e.g. the card that was clicked) while the latest copy loads
export function useProduct(id: string, initial?: Product | null) {
  const [result, setResult] = useState<{ id: string; product: Product | null; error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProduct(id)
      .then((product) => !cancelled && setResult({ id, product, error: "" }))
      .catch((err) => !cancelled && setResult({ id, product: null, error: errorMessage(err) }));
    return () => { cancelled = true; };
  }, [id]);

  const isLoading = result?.id !== id;
  return {
    product: isLoading ? initial ?? null : result.product,
    isLoading,
    error: isLoading ? "" : result.error,
  };
}
