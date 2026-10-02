import mongoose, { Document, Schema } from "mongoose";

// One cart per user. Digital goods are licensed once per buyer, so there are no quantities.
export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
}

export const MAX_CART_ITEMS = 50;

const CartSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ICart>("Cart", CartSchema);
