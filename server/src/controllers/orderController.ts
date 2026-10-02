import type { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Cart from "../models/Cart";
import Product from "../models/Product";
import { nextSequence, formatDocNumber } from "../models/Counter";
import { buildCart } from "./cartController";
import { splitRevenue, toCents } from "../utils/pricing";
import { getPaymentProvider } from "../services/payments";
import { sellerIdOf } from "../services/ownership";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Public checkout settings for the client (test-mode banner, currency)
// @route   GET /api/orders/payment-config
export const getPaymentConfig = (_req: any, res: Response) => {
  const provider = getPaymentProvider();
  res.json({ provider: provider.name, testMode: provider.testMode });
};

// @desc    Pay for everything in my cart
// @route   POST /api/orders/checkout
// @header  Idempotency-Key: <uuid per checkout attempt>
// @body    { billing: { name, email }, paymentMethod?: string, expectedTotalCents: number }
export const checkout = async (req: any, res: Response) => {
  const userId = req.user._id;

  // 1. Idempotency — a repeated submit returns the original result instead of charging again
  const idempotencyKey = req.get("Idempotency-Key");
  if (!idempotencyKey || idempotencyKey.length > 100) {
    return res.status(400).json({ message: "Missing Idempotency-Key header" });
  }
  const previous = await Order.findOne({ buyerId: userId, idempotencyKey });
  if (previous) {
    if (previous.status === "paid") return res.status(200).json(previous);
    if (previous.status === "failed") {
      return res.status(402).json({ code: "PAYMENT_FAILED", message: previous.payment?.failureReason ?? "Payment failed", orderId: previous._id });
    }
    return res.status(409).json({ code: "IN_PROGRESS", message: "This payment is already being processed" });
  }

  // 2. Validate input
  const { billing, paymentMethod, expectedTotalCents } = req.body ?? {};
  const name = String(billing?.name ?? "").trim();
  const email = String(billing?.email ?? "").trim().toLowerCase();
  if (!name || name.length > 100) return res.status(400).json({ message: "Please enter the billing name" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid billing email" });

  // 3. Re-price from the database and make sure the buyer saw the same bill
  const cart = await buildCart(userId);
  if (cart.items.length === 0) {
    return res.status(400).json({ code: "CART_EMPTY", message: "Your cart is empty", cart });
  }
  if (cart.notices.length > 0) {
    return res.status(409).json({ code: "CART_CHANGED", message: cart.notices.join(" "), cart });
  }
  if (Number(expectedTotalCents) !== cart.summary.totalCents) {
    return res.status(409).json({ code: "PRICE_CHANGED", message: "Prices in your cart changed. Please review the updated total.", cart });
  }
  const { summary } = cart;
  if (summary.totalCents > 0 && typeof paymentMethod !== "string") {
    return res.status(400).json({ message: "Please provide a payment method" });
  }

  // 4. Create the order (pending) with an immutable snapshot of what is being bought
  const year = new Date().getFullYear();
  let order;
  try {
    order = await Order.create({
      orderNumber: formatDocNumber("LK", year, await nextSequence(`order-${year}`)),
      buyerId: userId,
      items: cart.items.map((p) => {
        const unitPriceCents = toCents(p.price);
        return {
          productId: p._id,
          sellerId: sellerIdOf(p),
          title: p.title,
          category: p.category,
          previewImageUrl: p.previewImageUrl,
          fileName: p.fileName,
          fileType: p.fileType,
          fileSize: p.fileSize,
          unitPriceCents,
          ...splitRevenue(unitPriceCents),
        };
      }),
      currency: summary.currency,
      subtotalCents: summary.subtotalCents,
      taxRate: summary.taxRate,
      taxCents: summary.taxCents,
      totalCents: summary.totalCents,
      billing: { name, email },
      idempotencyKey,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ code: "IN_PROGRESS", message: "This payment is already being processed" });
    }
    return res.status(500).json({ message: "Could not create order" });
  }

  // 5. Charge (free carts skip the gateway)
  const provider = getPaymentProvider();
  let result;
  if (summary.totalCents === 0) {
    result = { status: "succeeded" as const, transactionId: `free_${order.orderNumber}`, card: undefined };
  } else {
    try {
      result = await provider.charge({
        amountCents: summary.totalCents,
        currency: summary.currency,
        paymentMethod,
        description: `LaunchKit order ${order.orderNumber}`,
        idempotencyKey: order.orderNumber,
        metadata: { orderId: String(order._id), buyerId: String(userId) },
      });
    } catch {
      result = { status: "failed" as const, failureMessage: "The payment service is unavailable. You have not been charged — please try again." };
    }
  }

  if (result.status !== "succeeded") {
    order.status = "failed";
    order.payment = { provider: provider.name, ...result.card, failureReason: result.failureMessage };
    await order.save();
    return res.status(402).json({ code: "PAYMENT_FAILED", message: result.failureMessage, orderId: order._id });
  }

  // 6. Mark paid, issue a receipt number, fulfil
  order.status = "paid";
  order.paidAt = new Date();
  order.payment = {
    provider: summary.totalCents === 0 ? "free" : provider.name,
    transactionId: result.transactionId,
    ...result.card,
  };
  order.receiptNumber = formatDocNumber("RCT", year, await nextSequence(`receipt-${year}`));
  await order.save();

  const productIds = order.items.map((i) => i.productId);
  await Promise.all([
    Cart.updateOne({ userId }, { $pull: { items: { productId: { $in: productIds } } } }),
    // downloadsCount doubles as the product's sales/popularity counter
    Product.updateMany({ _id: { $in: productIds } }, { $inc: { downloadsCount: 1 } }),
  ]);

  // No email service yet — log the receipt the same way OTPs are logged in development
  console.log(`\n🧾 [MVP Receipt] ${order.receiptNumber} → ${email} | ${order.items.length} item(s) | ${(order.totalCents / 100).toFixed(2)} ${order.currency}\n`);

  res.status(201).json(order);
};

// @desc    My order history (completed orders)
// @route   GET /api/orders
export const getMyOrders = async (req: any, res: Response) => {
  try {
    const orders = await Order.find({ buyerId: req.user._id, status: { $in: ["paid", "refunded"] } })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Products I've bought, for the downloads library
// @route   GET /api/orders/library
export const getLibrary = async (req: any, res: Response) => {
  try {
    const orders = await Order.find({ buyerId: req.user._id, status: "paid" }).sort({ paidAt: -1 });

    const seen = new Set<string>();
    const entries = [];
    for (const order of orders) {
      for (const item of order.items) {
        const id = String(item.productId);
        if (seen.has(id)) continue;
        seen.add(id);
        entries.push({ order, item });
      }
    }

    // Live product data (current file name/size if the seller shipped an update)
    const products = await Product.find({ _id: { $in: [...seen] } });
    const live = new Map(products.map((p) => [String(p._id), p]));

    res.json(entries.map(({ order, item }) => {
      const product = live.get(String(item.productId));
      return {
        productId: item.productId,
        title: product?.title ?? item.title,
        category: item.category,
        previewImageUrl: product?.previewImageUrl ?? item.previewImageUrl,
        fileName: product?.fileName ?? item.fileName,
        fileType: product?.fileType ?? item.fileType,
        fileSize: product?.fileSize ?? item.fileSize,
        available: !!product,
        orderId: order._id,
        orderNumber: order.orderNumber,
        purchasedAt: order.paidAt,
      };
    }));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    One of my orders — everything needed to render the receipt
// @route   GET /api/orders/:id
export const getOrder = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findOne({ _id: id, buyerId: req.user._id })
      .populate("items.sellerId", "name");
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
