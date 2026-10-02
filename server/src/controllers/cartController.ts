import type { Response } from "express";
import mongoose from "mongoose";
import Cart, { MAX_CART_ITEMS } from "../models/Cart";
import Product, { type IProduct } from "../models/Product";
import { summarize } from "../utils/pricing";
import { getOwnedProductIds, hasPurchased, sellerIdOf } from "../services/ownership";

// Loads the cart and re-validates every line against the live catalogue. Anything that
// can no longer be bought (unpublished, deleted, already owned) is removed, and the
// buyer is told why via `notices`. Prices always come from the database, never the client.
export const buildCart = async (userId: mongoose.Types.ObjectId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    return { items: [] as IProduct[], summary: summarize([]), notices: [] as string[] };
  }

  const [products, owned] = await Promise.all([
    Product.find({ _id: { $in: cart.items.map((i) => i.productId) } }).populate("sellerId", "name avatar"),
    getOwnedProductIds(userId),
  ]);
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const valid: { product: IProduct; addedAt: Date }[] = [];
  const notices: string[] = [];
  for (const item of cart.items) {
    const product = byId.get(String(item.productId));
    if (!product || product.status !== "active") {
      notices.push(`${product ? `"${product.title}"` : "An item"} is no longer available and was removed from your cart.`);
    } else if (owned.has(String(product._id))) {
      notices.push(`You already own "${product.title}", so it was removed from your cart.`);
    } else if (sellerIdOf(product) === String(userId)) {
      notices.push(`"${product.title}" is your own product and was removed from your cart.`);
    } else {
      valid.push({ product, addedAt: item.addedAt });
    }
  }

  if (valid.length !== cart.items.length) {
    cart.items = valid.map((v) => ({ productId: v.product._id as mongoose.Types.ObjectId, addedAt: v.addedAt }));
    await cart.save();
  }

  const items = valid.map((v) => v.product);
  return { items, summary: summarize(items.map((p) => p.price)), notices };
};

const sendCart = async (req: any, res: Response, status = 200) => {
  res.status(status).json(await buildCart(req.user._id));
};

// @desc    Get my cart with a server-calculated bill summary
// @route   GET /api/cart
export const getCart = async (req: any, res: Response) => {
  try {
    await sendCart(req, res);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add a product to my cart
// @route   POST /api/cart/items  { productId }
export const addCartItem = async (req: any, res: Response) => {
  try {
    const { productId } = req.body ?? {};
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Invalid product" });

    const product = await Product.findOne({ _id: productId, status: "active" });
    if (!product) return res.status(404).json({ message: "This product is no longer available" });
    if (sellerIdOf(product) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't buy your own product" });
    }
    if (await hasPurchased(req.user._id, productId)) {
      return res.status(409).json({ message: "You already own this product — find it in your library", code: "ALREADY_OWNED" });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { userId: req.user._id, items: [] } },
      { upsert: true, returnDocument: "after" }
    );
    if (cart!.items.some((i) => String(i.productId) === String(productId))) return sendCart(req, res);
    if (cart!.items.length >= MAX_CART_ITEMS) {
      return res.status(400).json({ message: `Your cart is full (max ${MAX_CART_ITEMS} items)` });
    }

    // $ne guard keeps this idempotent under concurrent adds
    await Cart.updateOne(
      { userId: req.user._id, "items.productId": { $ne: product._id } },
      { $push: { items: { productId: product._id, addedAt: new Date() } } }
    );
    await sendCart(req, res, 201);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove a product from my cart
// @route   DELETE /api/cart/items/:productId
export const removeCartItem = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Invalid product" });

    await Cart.updateOne({ userId: req.user._id }, { $pull: { items: { productId } } });
    await sendCart(req, res);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Empty my cart
// @route   DELETE /api/cart
export const clearCart = async (req: any, res: Response) => {
  try {
    await Cart.updateOne({ userId: req.user._id }, { $set: { items: [] } });
    await sendCart(req, res);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
