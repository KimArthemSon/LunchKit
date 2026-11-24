// Realtime event contract. Keep in sync with client/src/realtime/events.ts.
// Events are notifications only: REST stays the source of truth, so clients refetch on receipt.

export interface SaleItem {
  productId: string;
  title: string;
  earningsCents: number;
}

export interface ServerToClientEvents {
  // To each seller with items in a freshly paid order
  "sale:new": (payload: { orderNumber: string; currency: string; items: SaleItem[] }) => void;
  // To the buyer (all their tabs/devices) once an order is paid
  "order:paid": (payload: { orderId: string; orderNumber: string; productIds: string[] }) => void;
  // To users who have this product in their cart, after it was edited, archived or deleted
  "product:updated": (payload: { productId: string }) => void;
  // To the seller when a payout is created or changes status
  "payout:updated": (payload: { payoutNumber: string; status: string }) => void;
}

// Clients don't send anything yet
export interface ClientToServerEvents {}

export interface SocketData {
  userId: string;
  role: string;
}
