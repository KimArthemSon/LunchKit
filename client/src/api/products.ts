import { API_URL, apiRequest } from "./http";

export { API_URL };

export const PRODUCT_CATEGORIES = ["Mockups", "Graphics", "Videos", "Templates", "Bundles"] as const;
export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface SellerSummary {
  _id: string;
  name: string;
  avatar?: string;
}

export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  sellerId: string | SellerSummary; // Populated on public endpoints
  fileName: string;
  previewImageUrl?: string; // Server-relative path — wrap with assetUrl()
  fileType?: string;
  fileSize?: number;
  status: ProductStatus;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  status: ProductStatus;
  file?: File; // Required on create, optional on update (replaces the existing file)
  previewImage?: File;
}

export type ProductSort = "newest" | "oldest" | "price_asc" | "price_desc" | "popular";

export interface BrowseParams {
  search?: string;
  category?: ProductCategory;
  sort?: ProductSort; // Omit for default: best match when searching, otherwise newest
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface ProductPage {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductFeed {
  trending: Product[];
  newArrivals: Product[];
  byCategory: Record<ProductCategory, Product[]>;
  categoryCounts: Partial<Record<ProductCategory, number>>;
  total: number;
}

export const sellerName = (product: Product) =>
  typeof product.sellerId === "object" ? product.sellerId.name : undefined;

const NEW_PRODUCT_DAYS = 14;
export const isNewProduct = (product: Product) =>
  Date.now() - new Date(product.createdAt).getTime() < NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;

export const assetUrl =(path?: string) =>
  !path ? undefined : /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;

export const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes, i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const request = <T,>(path: string, token: string | null, options: RequestInit = {}) =>
  apiRequest<T>(`/api/products${path}`, token, options);

const toFormData = (input: Partial<ProductInput>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    form.append(key, value instanceof File ? value : String(value));
  }
  return form;
};

// ── Public storefront ──

export const browseProducts = (params: BrowseParams = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return request<ProductPage>(qs ? `?${qs}` : "", null);
};

export const getProductFeed = () => request<ProductFeed>("/feed", null);

export const getProduct = (id: string) => request<Product>(`/${encodeURIComponent(id)}`, null);

// ── Seller ──

export const getMyProducts =(token: string | null, status?: ProductStatus) =>
  request<Product[]>(`/mine${status ? `?status=${status}` : ""}`, token);

export const createProduct = (token: string | null, input: ProductInput) =>
  request<Product>("/", token, { method: "POST", body: toFormData(input) });

export const updateProduct = (token: string | null, id: string, input: Partial<ProductInput>) =>
  request<Product>(`/${id}`, token, { method: "PUT", body: toFormData(input) });

export const deleteProduct = (token: string | null, id: string) =>
  request<{ message: string }>(`/${id}`, token, { method: "DELETE" });

// Fetches the private file with the auth header, then triggers a browser download
export const downloadProductFile = async (token: string | null, product: Pick<Product, "_id" | "fileName">) => {
  const res = await fetch(`${API_URL}/api/products/${product._id}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Download failed");
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = product.fileName;
  a.click();
  URL.revokeObjectURL(url);
};
