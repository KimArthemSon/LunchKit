import { apiRequest } from "./http";
import type { Product } from "./products";

// Server-calculated bill — the client never computes prices it charges
export interface PriceSummary {
  currency: string;
  itemCount: number;
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
}

export interface CartResponse {
  items: Product[];
  summary: PriceSummary;
  notices: string[]; // Why items were auto-removed (unavailable, already owned, ...)
}

export const EMPTY_SUMMARY: PriceSummary = {
  currency: "USD", itemCount: 0, subtotalCents: 0, taxRate: 0, taxCents: 0, totalCents: 0,
};

export const getCart = (token: string) => apiRequest<CartResponse>("/api/cart", token);

export const addCartItem = (token: string, productId: string) =>
  apiRequest<CartResponse>("/api/cart/items", token, { method: "POST", body: JSON.stringify({ productId }) });

export const removeCartItem = (token: string, productId: string) =>
  apiRequest<CartResponse>(`/api/cart/items/${productId}`, token, { method: "DELETE" });

export const clearCart = (token: string) => apiRequest<CartResponse>("/api/cart", token, { method: "DELETE" });
