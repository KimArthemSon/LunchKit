import mongoose, { Document, Schema } from "mongoose";

export const PAYOUT_STATUSES = ["processing", "paid", "failed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export interface IPayout extends Document {
  payoutNumber: string; // e.g. PO-2026-000001
  sellerId: mongoose.Types.ObjectId;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  // Snapshot of where the money is going at request time (masked for display)
  destination: {
    method: string;
    accountName: string;
    accountNumber: string;
    bankName?: string;
  };
  paidAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema: Schema = new Schema(
  {
    payoutNumber: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: PAYOUT_STATUSES, default: "processing" },
    destination: {
      method: { type: String, required: true },
      accountName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      bankName: { type: String },
    },
    paidAt: { type: Date },
    failureReason: { type: String },
  },
  { timestamps: true }
);

PayoutSchema.index({ sellerId: 1, createdAt: -1 });
// At most one payout in flight per seller — prevents double-withdrawing the same balance
PayoutSchema.index(
  { sellerId: 1 },
  { unique: true, partialFilterExpression: { status: "processing" }, name: "one_processing_payout_per_seller" }
);

export default mongoose.model<IPayout>("Payout", PayoutSchema);
