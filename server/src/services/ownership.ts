import type mongoose from "mongoose";
import Order from "../models/Order";

type Id = mongoose.Types.ObjectId | string;

// A user "owns" a product once it appears in one of their paid orders
export const getOwnedProductIds = async (userId: Id): Promise<Set<string>> => {
  const ids = await Order.distinct("items.productId", { buyerId: userId, status: "paid" });
  return new Set(ids.map(String));
};

export const hasPurchased = async (userId: Id, productId: Id) =>
  !!(await Order.exists({ buyerId: userId, status: "paid", "items.productId": productId }));

// Any completed sale (incl. later refunded) — used to protect sold products from deletion
export const hasAnySales = async (productId: Id) =>
  !!(await Order.exists({ "items.productId": productId, status: { $in: ["paid", "refunded"] } }));

export const sellerIdOf = (product: { sellerId: unknown }) => {
  const seller = product.sellerId as { _id?: unknown } | null;
  return String(seller && typeof seller === "object" && "_id" in seller ? seller._id : seller);
};
