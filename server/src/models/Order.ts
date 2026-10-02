import mongoose, { Document, Schema } from "mongoose";

export const ORDER_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Snapshot of the product at purchase time — the receipt must never change if the
// seller later edits or archives the product. All money is stored in integer cents.
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  title: string;
  category: string;
  previewImageUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  unitPriceCents: number;
  platformFeeCents: number;
  sellerEarningsCents: number;
}

export interface IOrder extends Document {
  orderNumber: string; // Assigned on creation, e.g. LK-2026-000123
  receiptNumber?: string; // Assigned only once paid, e.g. RCT-2026-000045
  buyerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  currency: string;
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
  status: OrderStatus;
  billing: { name: string; email: string };
  payment?: {
    provider: string;
    transactionId?: string;
    brand?: string;
    last4?: string;
    failureReason?: string;
  };
  paidAt?: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    previewImageUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: Number },
    unitPriceCents: { type: Number, required: true, min: 0 },
    platformFeeCents: { type: Number, required: true, min: 0 },
    sellerEarningsCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema: Schema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    receiptNumber: { type: String, unique: true, sparse: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [OrderItemSchema], validate: (v: unknown[]) => v.length > 0 },
    currency: { type: String, default: "USD" },
    subtotalCents: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    taxCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    billing: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
    payment: {
      provider: { type: String },
      transactionId: { type: String },
      brand: { type: String },
      last4: { type: String },
      failureReason: { type: String },
    },
    paidAt: { type: Date },
    idempotencyKey: { type: String, select: false },
  },
  { timestamps: true }
);

// Buyer order history
OrderSchema.index({ buyerId: 1, createdAt: -1 });
// Ownership checks ("has this user bought product X?") and the buyer's library
OrderSchema.index({ buyerId: 1, status: 1, "items.productId": 1 });
// Seller sales reporting
OrderSchema.index({ "items.sellerId": 1, status: 1, paidAt: -1 });
// Same checkout submitted twice (double click, retry) must never create a second charge
OrderSchema.index(
  { buyerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
