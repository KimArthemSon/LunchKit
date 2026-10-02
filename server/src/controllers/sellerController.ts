import type { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Payout from "../models/Payout";
import User from "../models/User";
import { nextSequence, formatDocNumber } from "../models/Counter";
import { CURRENCY, getEarningsHoldDays, getMinPayoutCents, getPlatformFeeRate } from "../utils/pricing";

const DAY_MS = 24 * 60 * 60 * 1000;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "juan.delacruz@gmail.com" -> "j***z@gmail.com" — sellers see who bought, not full contact details
export const maskEmail = (email: string) => {
  const [local = "", domain = ""] = email.split("@");
  if (local.length <= 2) return `${local[0] ?? ""}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

const maskAccount = (account?: { method: string; accountName: string; accountNumber: string; bankName?: string } | null) => {
  if (!account?.method) return null;
  const n = account.accountNumber;
  const masked = account.method === "paypal" ? maskEmail(n) : `•••• ${n.slice(-4)}`;
  return { method: account.method, accountName: account.accountName, bankName: account.bankName, accountNumberMasked: masked };
};

// Pipeline stages that turn orders into one row per line item sold by this seller
export const sellerLines = (sellerId: mongoose.Types.ObjectId, statuses: string[]) => [
  { $match: { "items.sellerId": sellerId, status: { $in: statuses } } },
  { $unwind: "$items" },
  { $match: { "items.sellerId": sellerId } },
];

// @desc    My sales (one row per product sold), with search, status filter and totals
// @route   GET /api/seller/sales?search=&status=completed|refunded&page=&limit=
export const getSales = async (req: any, res: Response) => {
  try {
    const sellerId = req.user._id as mongoose.Types.ObjectId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = String(req.query.search ?? "").trim();
    const status = req.query.status === "completed" ? ["paid"] : req.query.status === "refunded" ? ["refunded"] : ["paid", "refunded"];

    const filters: mongoose.PipelineStage[] = [];
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filters.push({ $match: { $or: [{ orderNumber: re }, { "billing.name": re }, { "items.title": re }] } });
    }

    const [result] = await Order.aggregate([
      ...sellerLines(sellerId, status),
      ...filters,
      { $sort: { paidAt: -1, _id: -1 } },
      {
        $facet: {
          rows: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                orderId: "$_id",
                orderNumber: 1,
                status: 1,
                paidAt: 1,
                customerName: "$billing.name",
                customerEmail: "$billing.email",
                productId: "$items.productId",
                productTitle: "$items.title",
                category: "$items.category",
                priceCents: "$items.unitPriceCents",
                feeCents: "$items.platformFeeCents",
                earningsCents: "$items.sellerEarningsCents",
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                grossCents: { $sum: "$items.unitPriceCents" },
                feesCents: { $sum: "$items.platformFeeCents" },
                netCents: { $sum: "$items.sellerEarningsCents" },
              },
            },
          ],
        },
      },
    ]);

    const totals = result.totals[0] ?? { count: 0, grossCents: 0, feesCents: 0, netCents: 0 };
    res.json({
      sales: result.rows.map((r: any) => ({
        ...r,
        status: r.status === "paid" ? "completed" : r.status,
        customerEmail: maskEmail(r.customerEmail),
      })),
      summary: { count: totals.count, grossCents: totals.grossCents, feesCents: totals.feesCents, netCents: totals.netCents, currency: CURRENCY },
      page,
      limit,
      total: totals.count,
      totalPages: Math.ceil(totals.count / limit),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Balance math shared by the earnings page and payout requests
export const computeBalance = async (sellerId: mongoose.Types.ObjectId) => {
  const holdDays = getEarningsHoldDays();
  const clearedBefore = new Date(Date.now() - holdDays * DAY_MS);

  const [earnings, payouts] = await Promise.all([
    Order.aggregate([
      ...sellerLines(sellerId, ["paid"]), // Refunded sales don't earn
      {
        $group: {
          _id: null,
          grossCents: { $sum: "$items.unitPriceCents" },
          feesCents: { $sum: "$items.platformFeeCents" },
          netCents: { $sum: "$items.sellerEarningsCents" },
          clearedCents: { $sum: { $cond: [{ $lte: ["$paidAt", clearedBefore] }, "$items.sellerEarningsCents", 0] } },
        },
      },
    ]),
    Payout.aggregate([
      { $match: { sellerId, status: { $in: ["processing", "paid"] } } },
      { $group: { _id: "$status", amountCents: { $sum: "$amountCents" } } },
    ]),
  ]);

  const e = earnings[0] ?? { grossCents: 0, feesCents: 0, netCents: 0, clearedCents: 0 };
  const processingCents = payouts.find((p) => p._id === "processing")?.amountCents ?? 0;
  const paidOutCents = payouts.find((p) => p._id === "paid")?.amountCents ?? 0;

  return {
    currency: CURRENCY,
    availableCents: Math.max(0, e.clearedCents - processingCents - paidOutCents),
    pendingCents: e.netCents - e.clearedCents,
    processingCents,
    paidOutCents,
    lifetimeGrossCents: e.grossCents,
    lifetimeFeesCents: e.feesCents,
    lifetimeNetCents: e.netCents,
    holdDays,
  };
};

// @desc    Balance, payout settings and a transaction ledger (sales + payouts)
// @route   GET /api/seller/earnings
export const getEarnings = async (req: any, res: Response) => {
  try {
    const sellerId = req.user._id as mongoose.Types.ObjectId;
    const holdDays = getEarningsHoldDays();

    const [balance, sales, payouts, user] = await Promise.all([
      computeBalance(sellerId),
      Order.aggregate([
        ...sellerLines(sellerId, ["paid", "refunded"]),
        { $sort: { paidAt: -1 } },
        { $limit: 100 },
        { $project: { orderNumber: 1, status: 1, paidAt: 1, title: "$items.title", earningsCents: "$items.sellerEarningsCents" } },
      ]),
      Payout.find({ sellerId }).sort({ createdAt: -1 }).limit(50),
      User.findById(sellerId).select("payoutAccount"),
    ]);

    const now = Date.now();
    const transactions = [
      ...sales.map((s: any) => {
        const availableOn = new Date(new Date(s.paidAt).getTime() + holdDays * DAY_MS);
        return {
          id: `${s.orderNumber}:${s.title}`,
          type: "earning" as const,
          reference: s.orderNumber,
          description: s.title,
          date: s.paidAt,
          amountCents: s.status === "refunded" ? 0 : s.earningsCents,
          status: s.status === "refunded" ? "refunded" : availableOn.getTime() <= now ? "available" : "pending",
          availableOn: s.status === "refunded" ? undefined : availableOn,
        };
      }),
      ...payouts.map((p) => ({
        id: p.payoutNumber,
        type: "payout" as const,
        reference: p.payoutNumber,
        description: `Payout to ${maskAccount(p.destination)?.accountNumberMasked ?? p.destination.method}`,
        date: p.createdAt,
        amountCents: -p.amountCents,
        status: p.status,
        availableOn: undefined,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);

    res.json({
      balance,
      minPayoutCents: getMinPayoutCents(),
      platformFeeRate: getPlatformFeeRate(),
      payoutAccount: maskAccount(user?.payoutAccount),
      hasProcessingPayout: balance.processingCents > 0,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Save where payouts are sent
// @route   PUT /api/seller/payout-account  { method, accountName, accountNumber, bankName? }
export const updatePayoutAccount = async (req: any, res: Response) => {
  try {
    const method = String(req.body?.method ?? "");
    const accountName = String(req.body?.accountName ?? "").trim();
    const accountNumber = String(req.body?.accountNumber ?? "").replace(/\s+/g, "");
    const bankName = String(req.body?.bankName ?? "").trim();

    if (!["bank", "gcash", "paypal"].includes(method)) return res.status(400).json({ message: "Choose a payout method" });
    if (accountName.length < 2 || accountName.length > 100) return res.status(400).json({ message: "Enter the account holder's full name" });
    if (method === "gcash" && !/^(09|\+639)\d{9}$/.test(accountNumber)) {
      return res.status(400).json({ message: "Enter a valid GCash mobile number (e.g. 09171234567)" });
    }
    if (method === "paypal" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountNumber)) {
      return res.status(400).json({ message: "Enter the email address of your PayPal account" });
    }
    if (method === "bank") {
      if (!bankName) return res.status(400).json({ message: "Enter your bank's name" });
      if (!/^\d{6,20}$/.test(accountNumber)) return res.status(400).json({ message: "Enter a valid bank account number (6–20 digits)" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { payoutAccount: { method, accountName, accountNumber, bankName: method === "bank" ? bankName : undefined, updatedAt: new Date() } },
      { returnDocument: "after", runValidators: true }
    ).select("payoutAccount");

    res.json({ payoutAccount: maskAccount(user?.payoutAccount) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Withdraw available balance to the saved payout account
// @route   POST /api/seller/payouts  { amountCents? }  (defaults to the full available balance)
export const requestPayout = async (req: any, res: Response) => {
  try {
    const sellerId = req.user._id as mongoose.Types.ObjectId;
    const user = await User.findById(sellerId).select("payoutAccount");
    if (!user?.payoutAccount?.method) {
      return res.status(400).json({ code: "NO_PAYOUT_ACCOUNT", message: "Add a payout method before requesting a payout" });
    }

    const balance = await computeBalance(sellerId);
    if (balance.processingCents > 0) {
      return res.status(409).json({ code: "PAYOUT_IN_PROGRESS", message: "You already have a payout being processed" });
    }

    const minPayoutCents = getMinPayoutCents();
    if (balance.availableCents === 0) {
      return res.status(400).json({
        code: "NO_AVAILABLE_BALANCE",
        message: balance.pendingCents > 0
          ? `Nothing is available to withdraw yet — earnings become available ${balance.holdDays} days after each sale.`
          : "You have no available balance to withdraw.",
      });
    }
    const requested = req.body?.amountCents === undefined ? balance.availableCents : Number(req.body.amountCents);
    if (!Number.isInteger(requested) || requested <= 0) return res.status(400).json({ message: "Enter a valid amount" });
    if (requested > balance.availableCents) {
      return res.status(400).json({ code: "INSUFFICIENT_BALANCE", message: "That's more than your available balance" });
    }
    if (requested < minPayoutCents) {
      return res.status(400).json({
        code: "BELOW_MINIMUM",
        message: `The minimum payout is $${(minPayoutCents / 100).toFixed(2)}`,
      });
    }

    const year = new Date().getFullYear();
    const { method, accountName, accountNumber, bankName } = user.payoutAccount;
    const payout = await Payout.create({
      payoutNumber: formatDocNumber("PO", year, await nextSequence(`payout-${year}`)),
      sellerId,
      amountCents: requested,
      currency: CURRENCY,
      destination: { method, accountName, accountNumber, bankName },
    });

    console.log(`\n💸 [MVP Payout] ${payout.payoutNumber} | $${(requested / 100).toFixed(2)} → ${method} ${maskAccount(user.payoutAccount)?.accountNumberMasked} (awaiting processing)\n`);

    res.status(201).json({
      payoutNumber: payout.payoutNumber,
      amountCents: payout.amountCents,
      status: payout.status,
      destination: maskAccount(payout.destination),
      createdAt: payout.createdAt,
    });
  } catch (error: any) {
    // Unique index: a concurrent request already created a processing payout
    if (error?.code === 11000) {
      return res.status(409).json({ code: "PAYOUT_IN_PROGRESS", message: "You already have a payout being processed" });
    }
    res.status(500).json({ message: "Server error" });
  }
};
