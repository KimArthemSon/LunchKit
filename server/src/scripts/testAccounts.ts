/**
 * Two fresh accounts for trying checkout (e.g. with Stripe test mode) end to end.
 *
 *   npm run test-accounts            → reset: remove previous test accounts' data, create them again
 *   npm run test-accounts -- --clear → remove them only
 *
 * Only users whose email ends in @launchkit.test are touched, separate from the
 * @launchkit.demo data that `npm run seed` manages, so the two never wipe each other.
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
import { PRODUCT_FILES_DIR, PREVIEW_DIR, PREVIEW_PUBLIC_PATH } from "../middleware/uploadMiddleware";

const TEST_EMAIL_RE = /@launchkit\.test$/i;
const PASSWORD = "test1234";
const CUSTOMER = { name: "Test Customer", email: "customer@launchkit.test" };
const SELLER = { name: "Test Seller Studio", email: "seller@launchkit.test" };

const PRODUCTS = [
  { title: "Test Mobile App Mockup", category: "Mockups", price: 12, colors: ["#7c3aed", "#db2777"] },
  { title: "Test Social Media Graphics Pack", category: "Graphics", price: 9, colors: ["#2563eb", "#0891b2"] },
  { title: "Test Pitch Deck Template", category: "Templates", price: 24, colors: ["#ea580c", "#ca8a04"] },
] as const;

const escapeXml = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
const previewSvg = (title: string, category: string, [from, to]: readonly [string, string]) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="660" cy="110" r="220" fill="#fff" opacity="0.08"/>
  <text x="60" y="300" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#fff">${escapeXml(title)}</text>
  <text x="60" y="350" font-family="Arial, sans-serif" font-size="26" fill="#fff" opacity="0.8">${escapeXml(category)} · LaunchKit test product</text>
</svg>`;

const clearTestAccounts = async () => {
  const users = await User.find({ email: TEST_EMAIL_RE }, { _id: 1 }).lean();
  const ids = users.map((u) => u._id);
  if (ids.length === 0) return 0;

  const products = await Product.find({ sellerId: { $in: ids } }).select("+fileUrl").lean();
  for (const p of products) {
    if (p.fileUrl?.startsWith("test-")) fs.rmSync(path.join(PRODUCT_FILES_DIR, p.fileUrl), { force: true });
    if (p.previewImageUrl?.includes("/test-")) fs.rmSync(path.join(PREVIEW_DIR, path.basename(p.previewImageUrl)), { force: true });
  }
  const productIds = products.map((p) => p._id);

  // Orders the test customer placed, and any order containing the test seller's products
  await Order.deleteMany({ $or: [{ buyerId: { $in: ids } }, { "items.sellerId": { $in: ids } }] });
  await Cart.deleteMany({ userId: { $in: ids } });
  await Cart.updateMany({}, { $pull: { items: { productId: { $in: productIds } } } });
  await Payout.deleteMany({ sellerId: { $in: ids } });
  await Product.deleteMany({ _id: { $in: productIds } });
  await User.deleteMany({ _id: { $in: ids } });
  return ids.length;
};

const createTestAccounts = async () => {
  const password = await bcrypt.hash(PASSWORD, 10);
  await User.create({ ...CUSTOMER, password, role: "customer", needsOnboarding: false });
  const seller = await User.create({
    ...SELLER,
    password,
    role: "seller",
    needsOnboarding: false,
    // So "Request payout" works once earnings clear the hold period
    payoutAccount: { method: "gcash", accountName: SELLER.name, accountNumber: "09170000000", updatedAt: new Date() },
  });

  fs.mkdirSync(PRODUCT_FILES_DIR, { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  for (const p of PRODUCTS) {
    const id = crypto.randomUUID();
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const content = `${p.title}\nby ${SELLER.name}\n\nTest product created by \`npm run test-accounts\`. If you can download this, the purchase worked.\n`;
    fs.writeFileSync(path.join(PRODUCT_FILES_DIR, `test-${id}.txt`), content);
    fs.writeFileSync(path.join(PREVIEW_DIR, `test-${id}.svg`), previewSvg(p.title, p.category, p.colors));
    await Product.create({
      title: p.title,
      description: `A sample ${p.category.toLowerCase()} product for testing checkout and the seller dashboard.`,
      price: p.price,
      category: p.category,
      status: "active",
      sellerId: seller._id,
      fileUrl: `test-${id}.txt`,
      fileName: `${slug}.txt`,
      fileType: "txt",
      fileSize: Buffer.byteLength(content),
      previewImageUrl: `${PREVIEW_PUBLIC_PATH}/test-${id}.svg`,
    });
  }
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const removed = await clearTestAccounts();
  if (removed) console.log(`Removed ${removed} previous test account(s) and their data.`);

  if (process.argv.includes("--clear")) {
    console.log("Test accounts cleared.");
  } else {
    await createTestAccounts();
    console.log(`\nTest accounts ready (password for both: ${PASSWORD})`);
    console.log(`  Customer: ${CUSTOMER.email}   → browse, add to cart, check out`);
    console.log(`  Seller:   ${SELLER.email}     → ${PRODUCTS.length} active products; watch sales arrive live`);
  }
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("Creating test accounts failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
