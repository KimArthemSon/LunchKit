import type { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Product from "../models/Product";
import { CURRENCY } from "../utils/pricing";
import { computeBalance, maskEmail, sellerLines } from "./sellerController";

type Unit = "day" | "week" | "month";

// Each range is a whole number of calendar buckets ending with the current one
const RANGES: Record<string, { unit: Unit; count: number }> = {
  "7d": { unit: "day", count: 7 },
  "30d": { unit: "day", count: 30 },
  "90d": { unit: "week", count: 13 },
  "12m": { unit: "month", count: 12 },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

// Buckets follow the seller's local calendar. The client sends its UTC offset
// (Date#getTimezoneOffset, e.g. -480 for UTC+8); we do calendar math in "shifted" time.
const buildBuckets = (unit: Unit, count: number, offsetMin: number) => {
  const shiftedNow = Date.now() - offsetMin * 60_000;
  const d = new Date(shiftedNow);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    if (unit === "day") keys.push(isoDay(today - i * DAY_MS));
    else if (unit === "week") {
      const monday = today - ((d.getUTCDay() + 6) % 7) * DAY_MS;
      keys.push(isoDay(monday - i * 7 * DAY_MS));
    } else keys.push(isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)));
  }

  // First bucket's local midnight, converted back to a real instant
  const [y, m, day] = keys[0]!.split("-").map(Number) as [number, number, number];
  const start = new Date(Date.UTC(y, m - 1, day) + offsetMin * 60_000);
  const sign = offsetMin <= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return { keys, start, timezone: `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}` };
};

const pctChange = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : (current - previous) / previous; // null = "new"

// @desc    Everything the seller dashboard shows, scoped to one date range
// @route   GET /api/seller/overview?range=7d|30d|90d|12m&tzOffset=-480
export const getOverview = async (req: any, res: Response) => {
  try {
    const sellerId = req.user._id as mongoose.Types.ObjectId;
    const rangeKey = RANGES[req.query.range] ? String(req.query.range) : "30d";
    const { unit, count } = RANGES[rangeKey]!;
    const rawOffset = Number(req.query.tzOffset);
    const offsetMin = Number.isFinite(rawOffset) && Math.abs(rawOffset) <= 14 * 60 ? Math.round(rawOffset) : 0;

    const { keys, start, timezone } = buildBuckets(unit, count, offsetMin);
    const now = new Date();
    const previousStart = new Date(start.getTime() - (now.getTime() - start.getTime()));

    const totals = {
      $group: {
        _id: null,
        sales: { $sum: 1 },
        grossCents: { $sum: "$items.unitPriceCents" },
        netCents: { $sum: "$items.sellerEarningsCents" },
      },
    };

    const [[agg], balance, productCounts] = await Promise.all([
      Order.aggregate([
        ...sellerLines(sellerId, ["paid"]), // Refunded sales are excluded from performance
        { $match: { paidAt: { $gte: previousStart } } },
        {
          $facet: {
            current: [{ $match: { paidAt: { $gte: start } } }, totals],
            previous: [{ $match: { paidAt: { $lt: start } } }, totals],
            series: [
              { $match: { paidAt: { $gte: start } } },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      timezone,
                      date: { $dateTrunc: { date: "$paidAt", unit, timezone, startOfWeek: "monday" } },
                    },
                  },
                  sales: { $sum: 1 },
                  grossCents: { $sum: "$items.unitPriceCents" },
                  netCents: { $sum: "$items.sellerEarningsCents" },
                },
              },
            ],
            topProducts: [
              { $match: { paidAt: { $gte: start } } },
              {
                $group: {
                  _id: "$items.productId",
                  title: { $first: "$items.title" },
                  previewImageUrl: { $first: "$items.previewImageUrl" },
                  sales: { $sum: 1 },
                  grossCents: { $sum: "$items.unitPriceCents" },
                  netCents: { $sum: "$items.sellerEarningsCents" },
                },
              },
              { $sort: { netCents: -1, sales: -1 } },
              { $limit: 5 },
            ],
          },
        },
      ]),
      computeBalance(sellerId),
      Product.aggregate([
        { $match: { sellerId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    // Recent orders are "latest activity", independent of the range (incl. refunds)
    const recent = await Order.aggregate([
      ...sellerLines(sellerId, ["paid", "refunded"]),
      { $sort: { paidAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0, orderId: "$_id", orderNumber: 1, status: 1, paidAt: 1,
          customerName: "$billing.name", customerEmail: "$billing.email",
          productTitle: "$items.title", priceCents: "$items.unitPriceCents", earningsCents: "$items.sellerEarningsCents",
        },
      },
    ]);

    // Fill empty buckets so the chart has a point for every day/week/month
    const byKey = new Map(agg.series.map((s: any) => [s._id, s]));
    const series = keys.map((key) => {
      const s: any = byKey.get(key);
      return { date: key, sales: s?.sales ?? 0, grossCents: s?.grossCents ?? 0, netCents: s?.netCents ?? 0 };
    });

    // Prefer live product data (current title/preview) for top products
    const live = await Product.find({ _id: { $in: agg.topProducts.map((p: any) => p._id) } }).select("title previewImageUrl status");
    const liveById = new Map(live.map((p) => [String(p._id), p]));

    const cur = agg.current[0] ?? { sales: 0, grossCents: 0, netCents: 0 };
    const prev = agg.previous[0] ?? { sales: 0, grossCents: 0, netCents: 0 };
    const statusCount = (s: string) => productCounts.find((p) => p._id === s)?.count ?? 0;

    res.json({
      range: rangeKey,
      unit,
      currency: CURRENCY,
      period: { start, end: now, previousStart },
      stats: {
        earnings: { valueCents: cur.netCents, previousCents: prev.netCents, change: pctChange(cur.netCents, prev.netCents) },
        grossSales: { valueCents: cur.grossCents, previousCents: prev.grossCents, change: pctChange(cur.grossCents, prev.grossCents) },
        sales: { value: cur.sales, previous: prev.sales, change: pctChange(cur.sales, prev.sales) },
        products: { active: statusCount("active"), draft: statusCount("draft"), archived: statusCount("archived") },
        balance: { availableCents: balance.availableCents, pendingCents: balance.pendingCents, holdDays: balance.holdDays },
      },
      series,
      topProducts: agg.topProducts.map((p: any) => {
        const product = liveById.get(String(p._id));
        return {
          productId: p._id,
          title: product?.title ?? p.title,
          previewImageUrl: product?.previewImageUrl ?? p.previewImageUrl,
          status: product?.status ?? "deleted",
          sales: p.sales,
          grossCents: p.grossCents,
          netCents: p.netCents,
        };
      }),
      recentOrders: recent.map((r: any) => ({
        ...r,
        status: r.status === "paid" ? "completed" : r.status,
        customerEmail: maskEmail(r.customerEmail),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
