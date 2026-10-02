import { apiRequest } from "./http";
import type { ProductCategory } from "./products";

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  sellerId: string | { _id: string; name: string };
  title: string;
  category: ProductCategory;
  previewImageUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  unitPriceCents: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  receiptNumber?: string;
  items: OrderItem[];
  currency: string;
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
  status: OrderStatus;
  billing: { name: string; email: string };
  payment?: { provider: string; transactionId?: string; brand?: string; last4?: string };
  paidAt?: string;
  createdAt: string;
}

export interface LibraryItem {
  productId: string;
  title: string;
  category: ProductCategory;
  previewImageUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  available: boolean;
  orderId: string;
  orderNumber: string;
  purchasedAt: string;
}

export interface PaymentConfig {
  provider: string;
  testMode: boolean;
}

export interface CheckoutInput {
  billing: { name: string; email: string };
  paymentMethod?: string; // Tokenized card — never a raw card number
  expectedTotalCents: number;
}

export const getPaymentConfig = () => apiRequest<PaymentConfig>("/api/orders/payment-config", null);

// idempotencyKey must stay the same across retries of the *same* attempt, so a double
// click or network retry can never charge twice
export const checkout = (token: string, input: CheckoutInput, idempotencyKey: string) =>
  apiRequest<Order>("/api/orders/checkout", token, {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": idempotencyKey },
  });

export const getMyOrders = (token: string) => apiRequest<Order[]>("/api/orders", token);

export const getOrder = (token: string, id: string) => apiRequest<Order>(`/api/orders/${id}`, token);

export const getLibrary = (token: string) => apiRequest<LibraryItem[]>("/api/orders/library", token);
