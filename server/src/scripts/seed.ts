/**
 * Demo data for local development.
 *
 *   npm run seed            → remove previous demo data, then create a fresh set
 *   npm run seed -- --clear → remove demo data only
 *   npm run seed -- --previews → redraw demo cover images only (data untouched)
 *
 * Everything created here belongs to users whose email ends in @launchkit.demo, so it
 * can always be removed without touching real accounts. Data is generated with a fixed
 * random seed, so every run produces the same store.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Product from "../models/Product";
import Order from "../models/Order";
import Cart from "../models/Cart";
import Payout from "../models/Payout";
import Counter, { formatDocNumber, nextSequence } from "../models/Counter";
import { PRODUCT_FILES_DIR, PREVIEW_DIR, PREVIEW_PUBLIC_PATH } from "../middleware/uploadMiddleware";
import { CURRENCY, getEarningsHoldDays, getTaxRate, splitRevenue, toCents } from "../utils/pricing";

const DEMO_DOMAIN = "launchkit.demo";
const DEMO_EMAIL_RE = /@launchkit\.demo$/i;
const DEMO_PASSWORD = "demo1234";
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

// ── Deterministic randomness ──
let rngState = 20261003;
const rand = () => {
  rngState |= 0; rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const weightedPick = <T,>(items: T[], weight: (t: T) => number) => {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = rand() * total;
  for (const item of items) { r -= weight(item); if (r <= 0) return item; }
  return items[items.length - 1]!;
};
const daysAgo = (d: number) => new Date(NOW - d * DAY - randInt(0, 12 * 60) * 60_000);

// ── Catalogue ──
const SELLERS = [
  { name: "Pixel Forge Studio", handle: "pixelforge", payout: { method: "gcash", accountName: "Pixel Forge Studio", accountNumber: "09171234567" } },
  { name: "Deckwright", handle: "deckwright", payout: { method: "bank", accountName: "Andrea Villanueva", accountNumber: "001234567890", bankName: "BDO" } },
  { name: "Motion Lab PH", handle: "motionlab", payout: { method: "paypal", accountName: "Rafael Cruz", accountNumber: "rafael.motionlab@launchkit.demo" } },
  { name: "Launchpad Assets", handle: "launchpad", payout: { method: "gcash", accountName: "Bea Santos", accountNumber: "09281234567" } },
] as const;

const CUSTOMERS = [
  "Juan Dela Cruz", "Maria Santos", "Carlo Reyes", "Angelica Bautista", "Miguel Torres",
  "Sophia Lim", "Paolo Garcia", "Kristine Mendoza", "Liam Chen", "Aisha Rahman",
  "Noah Patel", "Isabella Rossi", "Ethan Nguyen", "Hannah Kim", "Diego Fernandez",
];

type Cat = "Mockups" | "Graphics" | "Videos" | "Templates" | "Bundles";
// [seller index, title, category, price, status, popularity, description]
const PRODUCTS: [number, string, Cat, number, "active" | "draft" | "archived", number, string][] = [
  [0, "iPhone 16 Pro Mockup Pack", "Mockups", 12.99, "active", 10, "12 high-res iPhone 16 Pro mockups in titanium finishes. Smart-object PSD + Figma frames, 4K renders, transparent backgrounds."],
  [0, "MacBook Pro M4 Scene Kit", "Mockups", 14.99, "active", 8, "Desk, studio and café scenes with a MacBook Pro M4. Drop in your screenshots — reflections and shadows included."],
  [0, "Android Device Frames", "Mockups", 9.99, "active", 6, "Pixel 9 and Galaxy S24 frames for Figma and Sketch. Light/dark variants with auto-layout screens."],
  [0, "Multi-Device Hero Mockup", "Mockups", 18.99, "active", 7, "Phone, tablet and laptop arranged for landing-page hero sections. Perfect for showing responsive apps at a glance."],
  [0, "Browser Window Mockups", "Mockups", 6.99, "active", 5, "Clean Chrome, Safari and Arc windows with light/dark themes for web-app screenshots."],
  [0, "Apple Watch UI Mockups", "Mockups", 7.99, "active", 3, "Series 10 and Ultra mockups with complications templates."],
  [0, "Clay Device Mockups", "Mockups", 11.99, "draft", 0, "Minimal clay-render device set (coming soon)."],
  [1, "Hackathon Pitch Deck", "Templates", 18.99, "active", 10, "A 14-slide deck built for 3-minute hackathon pitches: problem, demo, architecture, impact and team. Keynote, PowerPoint and Google Slides."],
  [1, "Startup Investor Deck", "Templates", 29.99, "active", 6, "Seed-round deck structure with traction, market sizing and financial slides. Includes speaker notes."],
  [1, "Capstone Defense Slides", "Templates", 15.99, "active", 8, "Academic-friendly template for thesis and capstone defenses — methodology, results and Q&A backup slides."],
  [1, "Product Demo Day Deck", "Templates", 12.99, "active", 5, "Showcase a shipped product: before/after, live demo cues and metrics slides."],
  [1, "README & Docs Template Kit", "Templates", 4.99, "active", 4, "GitHub README, CONTRIBUTING and docs-site templates that make repos look polished."],
  [1, "Resume for Developers", "Templates", 0, "active", 6, "Free ATS-friendly resume template for software engineers and IT students."],
  [1, "Old Pitch Deck v1", "Templates", 9.99, "archived", 2, "Previous version of the hackathon pitch deck — superseded by the new release."],
  [2, "Animated Lower Thirds", "Videos", 22.99, "active", 6, "30 animated name/title lower thirds for demo videos. After Effects + Premiere MOGRT."],
  [2, "App Demo Video Overlays", "Videos", 19.99, "active", 8, "Tap indicators, cursor highlights, zoom callouts and captions for screen-recorded app demos."],
  [2, "Code Typing Animations", "Videos", 16.99, "active", 5, "Animated code-editor scenes for explainer videos. Bring your own snippet and theme."],
  [2, "Product Launch Teaser Kit", "Videos", 34.99, "active", 4, "15–30 second teaser templates with kinetic typography and device reveals."],
  [2, "Glitch Transitions Pack", "Videos", 9.99, "active", 3, "40 glitch and RGB-split transitions for tech-themed edits."],
  [2, "Podcast Video Template", "Videos", 14.99, "draft", 0, "Audiogram and split-screen layouts for dev podcasts (in progress)."],
  [3, "Social Media Launch Kit", "Graphics", 16.99, "active", 7, "Launch-day posts for X, LinkedIn and Instagram: announcement, feature highlights and countdown templates."],
  [3, "Tech Icon Set (600+)", "Graphics", 12.99, "active", 6, "600+ line icons for dev tools, cloud and data — SVG, Figma and icon font."],
  [3, "Open Graph Image Templates", "Graphics", 7.99, "active", 5, "Link-preview images for blogs, docs and launches. Figma + Canva."],
  [3, "Gradient Backgrounds Vol. 2", "Graphics", 5.99, "active", 4, "48 4K mesh gradients for slides, hero sections and thumbnails."],
  [3, "Product Hunt Launch Assets", "Graphics", 14.99, "active", 6, "Gallery images, thumbnail and maker-comment templates sized for Product Hunt."],
  [3, "Hackathon Badge & Sticker Pack", "Graphics", 3.99, "active", 3, "Fun sticker and badge graphics for team branding."],
  [3, "Dev Portfolio UI Kit", "Graphics", 0, "active", 5, "Free Figma kit for building a developer portfolio site."],
  [0, "Ultimate Mockup Bundle", "Bundles", 39.99, "active", 5, "Every Pixel Forge mockup pack in one download — save over 50%."],
  [1, "Pitch Perfect Bundle", "Bundles", 44.99, "active", 4, "All Deckwright templates: hackathon, investor, capstone and demo-day decks."],
  [3, "Launch Day Mega Bundle", "Bundles", 49.99, "active", 4, "Social kit, OG templates, Product Hunt assets and icons — everything for launch day."],
];

const CATEGORY_COLORS: Record<Cat, [string, string]> = {
  Mockups: ["#7c3aed", "#1e1b4b"],
  Templates: ["#2563eb", "#0f172a"],
  Videos: ["#db2777", "#1f0a1a"],
  Graphics: ["#059669", "#022c22"],
  Bundles: ["#d97706", "#1c1003"],
};

// ── File generation ──
// Text-free cover art: a small illustration per category, varied per product so cards
// don't look identical. (Real sellers upload screenshots; this just keeps demos visual.)
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const ACCENTS = ["#f0abfc", "#93c5fd", "#fcd34d", "#86efac", "#fda4af"];

const illustration = (category: Cat, v: number, accent: string) => {
  const tilt = (v % 7) - 3;
  switch (category) {
    case "Mockups":
      return `
  <g transform="rotate(${tilt} 400 300)">
    <rect x="110" y="150" width="400" height="250" rx="16" fill="#0b0b12" opacity="0.9"/>
    <rect x="124" y="164" width="372" height="222" rx="8" fill="#fff" opacity="0.94"/>
    <rect x="124" y="164" width="372" height="34" rx="8" fill="${accent}" opacity="0.9"/>
    <rect x="146" y="220" width="160" height="14" rx="7" fill="#1f2937" opacity="0.8"/>
    <rect x="146" y="246" width="230" height="10" rx="5" fill="#9ca3af"/>
    <rect x="146" y="266" width="200" height="10" rx="5" fill="#9ca3af"/>
    <rect x="146" y="300" width="96" height="30" rx="15" fill="${accent}"/>
    <path d="M80 400 h460 l-30 26 h-400 z" fill="#0b0b12" opacity="0.85"/>
    <rect x="490" y="180" width="170" height="320" rx="28" fill="#0b0b12"/>
    <rect x="502" y="194" width="146" height="292" rx="20" fill="#fff"/>
    <rect x="550" y="202" width="50" height="10" rx="5" fill="#0b0b12"/>
    <rect x="516" y="230" width="118" height="120" rx="12" fill="${accent}" opacity="0.85"/>
    <rect x="516" y="366" width="90" height="10" rx="5" fill="#1f2937" opacity="0.8"/>
    <rect x="516" y="386" width="118" height="8" rx="4" fill="#9ca3af"/>
    <rect x="516" y="430" width="118" height="30" rx="15" fill="#1f2937"/>
  </g>`;
    case "Templates":
      return `
  <g transform="rotate(${tilt} 400 300)">
    <rect x="190" y="130" width="420" height="260" rx="14" fill="#fff" opacity="0.25" transform="rotate(-8 400 260)"/>
    <rect x="190" y="150" width="420" height="260" rx="14" fill="#fff" opacity="0.45" transform="rotate(-3 400 280)"/>
    <rect x="190" y="170" width="420" height="260" rx="14" fill="#fff"/>
    <rect x="220" y="200" width="180" height="18" rx="9" fill="#111827"/>
    <rect x="220" y="230" width="130" height="10" rx="5" fill="#9ca3af"/>
    <rect x="228" y="${330 - (v % 40)}" width="34" height="${70 + (v % 40)}" rx="6" fill="${accent}" opacity="0.7"/>
    <rect x="276" y="300" width="34" height="100" rx="6" fill="${accent}" opacity="0.85"/>
    <rect x="324" y="270" width="34" height="130" rx="6" fill="${accent}"/>
    <circle cx="510" cy="320" r="62" fill="none" stroke="#e5e7eb" stroke-width="22"/>
    <circle cx="510" cy="320" r="62" fill="none" stroke="#111827" stroke-width="22" stroke-dasharray="${180 + (v % 120)} 400" transform="rotate(-90 510 320)"/>
  </g>`;
    case "Videos":
      return `
  <g transform="rotate(${tilt / 2} 400 300)">
    <rect x="140" y="130" width="520" height="300" rx="18" fill="#0b0b12" opacity="0.85"/>
    <rect x="156" y="146" width="488" height="240" rx="10" fill="${accent}" opacity="0.35"/>
    <circle cx="400" cy="266" r="52" fill="#fff"/>
    <path d="M385 240 l44 26 -44 26 z" fill="#0b0b12"/>
    <rect x="156" y="404" width="488" height="8" rx="4" fill="#fff" opacity="0.25"/>
    <rect x="156" y="404" width="${180 + (v % 220)}" height="8" rx="4" fill="${accent}"/>
    <circle cx="${336 + (v % 220)}" cy="408" r="10" fill="#fff"/>
    <circle cx="190" cy="174" r="8" fill="#ef4444"/>
    <rect x="206" y="168" width="44" height="12" rx="6" fill="#fff" opacity="0.8"/>
    <rect x="200" y="470" width="400" height="34" rx="17" fill="#fff" opacity="0.15"/>
  </g>`;
    case "Graphics": {
      const shapes = Array.from({ length: 9 }, (_, i) => {
        const x = 205 + (i % 3) * 135, y = 105 + Math.floor(i / 3) * 135;
        const kind = (i + v) % 4;
        const highlighted = i === v % 9;
        const fill = highlighted ? accent : "#fff";
        const op = highlighted ? 1 : 0.85;
        const tile = `<rect x="${x}" y="${y}" width="110" height="110" rx="26" fill="#fff" opacity="${highlighted ? 0.24 : 0.12}"/>`;
        const cx = x + 55, cy = y + 55;
        const shape =
          kind === 0 ? `<circle cx="${cx}" cy="${cy}" r="27" fill="${fill}" opacity="${op}"/>`
          : kind === 1 ? `<rect x="${cx - 25}" y="${cy - 25}" width="50" height="50" rx="11" fill="${fill}" opacity="${op}"/>`
          : kind === 2 ? `<path d="M${cx} ${cy - 29} L${cx + 29} ${cy + 24} L${cx - 29} ${cy + 24} Z" fill="${fill}" opacity="${op}"/>`
          : `<path d="M${cx - 26} ${cy} h52 M${cx} ${cy - 26} v52" stroke="${fill}" stroke-width="12" stroke-linecap="round" opacity="${op}"/>`;
        return tile + shape;
      }).join("");
      return `<g transform="rotate(${tilt} 400 300)">${shapes}</g>`;
    }
    case "Bundles":
      return `
  <g transform="rotate(${tilt} 400 300)">
    <rect x="160" y="190" width="250" height="250" rx="22" fill="#fff" opacity="0.3" transform="rotate(-14 285 315)"/>
    <rect x="390" y="190" width="250" height="250" rx="22" fill="#fff" opacity="0.3" transform="rotate(14 515 315)"/>
    <rect x="275" y="150" width="250" height="280" rx="22" fill="#fff"/>
    <path d="M275 172 a22 22 0 0 1 22 -22 h206 a22 22 0 0 1 22 22 v68 h-250 z" fill="${accent}"/>
    <rect x="305" y="268" width="150" height="16" rx="8" fill="#111827"/>
    <rect x="305" y="296" width="190" height="10" rx="5" fill="#9ca3af"/>
    <rect x="305" y="316" width="170" height="10" rx="5" fill="#9ca3af"/>
    <rect x="305" y="366" width="110" height="36" rx="18" fill="#111827"/>
    <circle cx="512" cy="160" r="36" fill="#111827"/>
    <text x="512" y="168" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="21" font-weight="800" fill="#fff">-50%</text>
  </g>`;
  }
};

const previewSvg = (title: string, category: Cat, _seller: string) => {
  const [from, to] = CATEGORY_COLORS[category];
  const v = hash(title);
  const accent = ACCENTS[v % ACCENTS.length]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="${620 + (v % 120)}" cy="${60 + (v % 80)}" r="210" fill="#fff" opacity="0.07"/>
  <circle cx="${60 + (v % 100)}" cy="560" r="170" fill="#fff" opacity="0.05"/>
  ${illustration(category, v, accent)}
</svg>`;
};

// Minimal valid ZIP (stored, no compression) so demo downloads open in any unzip tool
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const makeZip = (files: { name: string; content: string }[]) => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name);
    const data = Buffer.from(f.content);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = centrals.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
};

// ── Clear ──
const realignCounters = async () => {
  const docs = await Order.find({}, { orderNumber: 1, receiptNumber: 1 }).lean();
  const payouts = await Payout.find({}, { payoutNumber: 1 }).lean();
  const max = new Map<string, number>();
  const track = (key: string, num?: string) => {
    if (!num) return;
    const [, year, seq] = num.split("-");
    const k = `${key}-${year}`;
    max.set(k, Math.max(max.get(k) ?? 0, Number(seq)));
  };
  docs.forEach((d) => { track("order", d.orderNumber); track("receipt", d.receiptNumber); });
  payouts.forEach((p) => track("payout", p.payoutNumber));

  const counters = await Counter.find({ _id: /^(order|receipt|payout)-\d{4}$/ }).lean();
  for (const c of counters) {
    const seq = max.get(String(c._id)) ?? 0;
    if (seq === 0) await Counter.deleteOne({ _id: c._id });
    else await Counter.updateOne({ _id: c._id }, { $set: { seq } });
  }
};

const clearDemo = async () => {
  const users = await User.find({ email: DEMO_EMAIL_RE }, { _id: 1 }).lean();
  const ids = users.map((u) => u._id);
  if (ids.length === 0) return { users: 0, products: 0, orders: 0 };

  const products = await Product.find({ sellerId: { $in: ids } }).select("+fileUrl").lean();
  for (const p of products) {
    if (p.fileUrl?.startsWith("demo-")) fs.rmSync(path.join(PRODUCT_FILES_DIR, p.fileUrl), { force: true });
    if (p.previewImageUrl?.includes("/demo-")) fs.rmSync(path.join(PREVIEW_DIR, path.basename(p.previewImageUrl)), { force: true });
  }
  const productIds = products.map((p) => p._id);

  const orders = await Order.deleteMany({ buyerId: { $in: ids } });
  await Cart.deleteMany({ userId: { $in: ids } });
  await Cart.updateMany({}, { $pull: { items: { productId: { $in: productIds } } } }); // From real users' carts
  await Payout.deleteMany({ sellerId: { $in: ids } });
  await Product.deleteMany({ _id: { $in: productIds } });
  await User.deleteMany({ _id: { $in: ids } });
  await realignCounters();
  return { users: ids.length, products: products.length, orders: orders.deletedCount };
};

// Insert with exact historical timestamps (mongoose would otherwise stamp "now"),
// after running full schema validation and defaults.
const insertValidated = async <T extends mongoose.Document>(Model: mongoose.Model<T>, data: Record<string, unknown>[]) => {
  const docs = [];
  for (const d of data) {
    const doc = new Model(d);
    await doc.validate();
    docs.push({ ...doc.toObject({ depopulate: true }), createdAt: d.createdAt, updatedAt: d.updatedAt ?? d.createdAt });
  }
  if (docs.length) await Model.collection.insertMany(docs as any[]);
  return docs as (Record<string, any> & { _id: mongoose.Types.ObjectId })[];
};

// ── Seed ──
const seed = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const holdDays = getEarningsHoldDays();
  const taxRate = getTaxRate();

  // Users
  const sellerDocs = await insertValidated(User, SELLERS.map((s, i) => ({
    name: s.name,
    email: `${s.handle}@${DEMO_DOMAIN}`,
    password: passwordHash,
    role: "seller",
    needsOnboarding: false,
    payoutAccount: { ...s.payout, updatedAt: daysAgo(380 - i * 10) },
    createdAt: daysAgo(420 - i * 15),
  })));
  const customerDocs = await insertValidated(User, CUSTOMERS.map((name, i) => ({
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${DEMO_DOMAIN}`,
    password: passwordHash,
    role: "customer",
    needsOnboarding: false,
    createdAt: daysAgo(randInt(30, 380) - i),
  })));

  // Products + files
  const productData = PRODUCTS.map(([sellerIdx, title, category, price, status, popularity, description], i) => {
    const seller = sellerDocs[sellerIdx]!;
    // A few brand-new products so the "New" badge and New Arrivals have content
    const createdAt = i % 7 === 3 ? daysAgo(randInt(2, 12)) : daysAgo(randInt(150, 400));
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = crypto.randomUUID();
    const fileUrl = `demo-${id}.zip`;
    const zip = makeZip([
      { name: `${slug}/README.txt`, content: `${title}\nby ${SELLERS[sellerIdx]!.name}\n\n${description}\n\nThis is LaunchKit demo content generated by \`npm run seed\`.\n` },
      { name: `${slug}/LICENSE.txt`, content: "LaunchKit Standard License — single user, commercial use allowed. (Demo file.)\n" },
    ]);
    fs.writeFileSync(path.join(PRODUCT_FILES_DIR, fileUrl), zip);
    const previewName = `demo-${id}.svg`;
    fs.writeFileSync(path.join(PREVIEW_DIR, previewName), previewSvg(title, category, SELLERS[sellerIdx]!.name));
    return {
      title, description, price, category, status,
      sellerId: seller._id,
      fileUrl,
      fileName: `${slug}.zip`,
      fileType: "zip",
      fileSize: zip.length,
      previewImageUrl: `${PREVIEW_PUBLIC_PATH}/${previewName}`,
      downloadsCount: 0,
      createdAt,
      updatedAt: createdAt,
      _popularity: popularity,
    };
  });
  const productDocs = await insertValidated(Product, productData.map(({ _popularity, ...p }) => p));
  const catalogue = productDocs.map((p, i) => ({ doc: p, popularity: productData[i]!._popularity }));

  // Orders — more recent months are busier (store growth), 1–3 items each
  const owned = new Map<string, Set<string>>();
  const plannedOrders: { paidAt: Date; buyer: (typeof customerDocs)[number]; items: typeof catalogue }[] = [];
  for (let n = 0; n < 150; n++) {
    const age = 365 * Math.pow(rand(), 1.6);
    const paidAt = new Date(NOW - age * DAY - randInt(0, 600) * 60_000);
    const buyer = pick(customerDocs);
    const mine = owned.get(String(buyer._id)) ?? new Set<string>();
    const available = catalogue.filter((c) =>
      c.popularity > 0 &&
      c.doc.createdAt < paidAt &&
      !(c.doc.status === "archived" && age < 120) && // Archived products stopped selling ~4 months ago
      !mine.has(String(c.doc._id))
    );
    if (available.length === 0) continue;
    const count = Math.min(available.length, rand() < 0.65 ? 1 : rand() < 0.75 ? 2 : 3);
    const items: typeof catalogue = [];
    while (items.length < count) {
      const choice = weightedPick(available.filter((a) => !items.includes(a)), (c) => c.popularity);
      items.push(choice);
    }
    items.forEach((i) => mine.add(String(i.doc._id)));
    owned.set(String(buyer._id), mine);
    plannedOrders.push({ paidAt, buyer, items });
  }
  plannedOrders.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());

  const orderData = [];
  const salesCount = new Map<string, number>();
  for (const o of plannedOrders) {
    const year = o.paidAt.getFullYear();
    const refunded = rand() < 0.03;
    const items = o.items.map(({ doc }) => {
      const unitPriceCents = toCents(doc.price);
      return {
        productId: doc._id, sellerId: doc.sellerId, title: doc.title, category: doc.category,
        previewImageUrl: doc.previewImageUrl, fileName: doc.fileName, fileType: doc.fileType, fileSize: doc.fileSize,
        unitPriceCents, ...splitRevenue(unitPriceCents),
      };
    });
    const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents, 0);
    const taxCents = Math.round(subtotalCents * taxRate);
    const free = subtotalCents === 0;
    const brand = pick(["visa", "visa", "mastercard", "amex"] as const);
    if (!refunded) items.forEach((i) => salesCount.set(String(i.productId), (salesCount.get(String(i.productId)) ?? 0) + 1));
    orderData.push({
      orderNumber: formatDocNumber("LK", year, await nextSequence(`order-${year}`)),
      receiptNumber: formatDocNumber("RCT", year, await nextSequence(`receipt-${year}`)),
      buyerId: o.buyer._id,
      items,
      currency: CURRENCY,
      subtotalCents, taxRate, taxCents, totalCents: subtotalCents + taxCents,
      status: refunded ? "refunded" : "paid",
      billing: { name: o.buyer.name, email: o.buyer.email },
      payment: free
        ? { provider: "free", transactionId: `free_${crypto.randomUUID().slice(0, 8)}` }
        : { provider: "sandbox", transactionId: `sbx_${crypto.randomUUID().replace(/-/g, "")}`, brand, last4: brand === "amex" ? "0005" : brand === "visa" ? "4242" : "4444" },
      paidAt: o.paidAt,
      createdAt: new Date(o.paidAt.getTime() - 60_000),
      updatedAt: o.paidAt,
    });
  }
  const orderDocs = await insertValidated(Order, orderData);
  for (const [productId, n] of salesCount) {
    await Product.collection.updateOne({ _id: new mongoose.Types.ObjectId(productId) }, { $set: { downloadsCount: n } });
  }

  // Payouts — monthly withdrawals of cleared earnings; one seller has a payout in progress
  const payoutData = [];
  for (const [sIdx, seller] of sellerDocs.entries()) {
    const lines = orderDocs
      .filter((o) => o.status === "paid")
      .flatMap((o) => o.items.filter((i: any) => String(i.sellerId) === String(seller._id)).map((i: any) => ({ at: o.paidAt as Date, net: i.sellerEarningsCents as number })));
    let withdrawn = 0;
    const schedule = sIdx === 2 ? [150, 60] : sIdx === 3 ? [] : [180, 120, 60, 30]; // Launchpad never withdrew
    for (const [k, ago] of schedule.entries()) {
      const at = daysAgo(ago);
      const cleared = lines.filter((l) => l.at.getTime() <= at.getTime() - holdDays * DAY).reduce((s, l) => s + l.net, 0);
      const amount = Math.floor((cleared - withdrawn) * 0.9);
      if (amount < 1000) continue;
      withdrawn += amount;
      const inProgress = sIdx === 1 && k === schedule.length - 1;
      const payoutAt = inProgress ? daysAgo(1) : at;
      payoutData.push({
        payoutNumber: formatDocNumber("PO", payoutAt.getFullYear(), await nextSequence(`payout-${payoutAt.getFullYear()}`)),
        sellerId: seller._id,
        amountCents: amount,
        currency: CURRENCY,
        status: inProgress ? "processing" : "paid",
        destination: SELLERS[sIdx]!.payout,
        paidAt: inProgress ? undefined : new Date(payoutAt.getTime() + 3 * DAY),
        createdAt: payoutAt,
      });
    }
  }
  const payoutDocs = await insertValidated(Payout, payoutData);

  // A few customers with something waiting in their cart
  const carts = [];
  for (const buyer of customerDocs.slice(0, 4)) {
    const mine = owned.get(String(buyer._id)) ?? new Set();
    const options = catalogue.filter((c) => c.doc.status === "active" && !mine.has(String(c.doc._id)));
    const items = [pick(options), pick(options)].filter((v, i, a) => a.indexOf(v) === i);
    carts.push({ userId: buyer._id, items: items.map((c) => ({ productId: c.doc._id, addedAt: daysAgo(randInt(0, 5)) })), createdAt: daysAgo(5) });
  }
  await insertValidated(Cart, carts);

  return { sellers: sellerDocs, customers: customerDocs, products: productDocs, orders: orderDocs, payouts: payoutDocs };
};

// ── Main ──
const main = async () => {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production");
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set");
  await mongoose.connect(uri);
  await Promise.all([User.init(), Product.init(), Order.init(), Cart.init(), Payout.init()]); // Ensure indexes exist
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  if (process.argv.includes("--previews")) {
    const sellers = await User.find({ email: DEMO_EMAIL_RE, role: "seller" }).lean();
    const products = await Product.find({ sellerId: { $in: sellers.map((u) => u._id) } }).lean();
    let n = 0;
    for (const p of products) {
      if (!p.previewImageUrl?.includes("/demo-")) continue;
      fs.writeFileSync(path.join(PREVIEW_DIR, path.basename(p.previewImageUrl)), previewSvg(p.title, p.category as Cat, ""));
      n++;
    }
    console.log(`Regenerated ${n} demo preview images.`);
    return mongoose.disconnect();
  }

  const cleared = await clearDemo();
  if (cleared.users) console.log(`Removed previous demo data: ${cleared.users} users, ${cleared.products} products, ${cleared.orders} orders`);

  if (process.argv.includes("--clear")) {
    console.log("Demo data cleared.");
  } else {
    const r = await seed();
    const paid = r.orders.filter((o) => o.status === "paid");
    const gross = paid.reduce((s, o) => s + o.subtotalCents, 0);
    console.log(`\nSeeded: ${r.sellers.length} sellers, ${r.customers.length} customers, ${r.products.length} products, ${r.orders.length} orders ($${(gross / 100).toFixed(2)} gross), ${r.payouts.length} payouts`);
    console.log(`\nDemo logins (password: ${DEMO_PASSWORD})`);
    console.log("  Sellers:   " + r.sellers.map((s) => s.email).join(", "));
    console.log("  Customers: " + r.customers.slice(0, 3).map((c) => c.email).join(", ") + `, … (${r.customers.length} total)`);
    console.log("\nRemove it all any time with: npm run seed -- --clear");
  }
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
