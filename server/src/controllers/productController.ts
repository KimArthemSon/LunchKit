import type { Request, Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import Product, { PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "../models/Product";
import {
  PRODUCT_FILES_DIR, PREVIEW_DIR, PREVIEW_PUBLIC_PATH, MAX_PREVIEW_SIZE,
} from "../middleware/uploadMiddleware";
import { hasAnySales, hasPurchased } from "../services/ownership";

// Fields a seller can set from the form. File fields are derived from the upload,
// and sellerId / downloadsCount are server-controlled.
const EDITABLE_FIELDS = ["title", "description", "price", "category", "status"] as const;

const pickEditable = (body: any) => {
  const data: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (body?.[key] !== undefined) data[key] = body[key];
  }
  return data;
};

const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  popular: { downloadsCount: -1 },
};

type UploadedFiles = { [field: string]: Express.Multer.File[] } | undefined;

const getUploads = (req: Request) => {
  const files = req.files as UploadedFiles;
  return { file: files?.file?.[0], preview: files?.previewImage?.[0] };
};

const removeFile = (filePath?: string) => {
  if (filePath) fs.promises.unlink(filePath).catch(() => {});
};

const productFilePath = (storedName: string) => path.join(PRODUCT_FILES_DIR, path.basename(storedName));
const previewFilePath = (publicUrl: string) => path.join(PREVIEW_DIR, path.basename(publicUrl));

const fileFields = (file: Express.Multer.File) => ({
  fileUrl: file.filename,
  fileName: file.originalname,
  fileType: path.extname(file.originalname).slice(1).toLowerCase() || undefined,
  fileSize: file.size,
});

const handleError = (res: Response, error: unknown) => {
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: error.message });
  }
  res.status(500).json({ message: "Server error" });
};

// @desc    List active products (search, filter, sort, paginate)
// @route   GET /api/products?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));

    const filter: Record<string, any> = { status: "active" };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice && !isNaN(Number(minPrice))) filter.price.$gte = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    // Default to relevance when searching, otherwise newest first
    const sortBy = sort && SORT_OPTIONS[sort]
      ? SORT_OPTIONS[sort]
      : search ? { score: { $meta: "textScore" } } : SORT_OPTIONS.newest;

    const projection = search ? { score: { $meta: "textScore" } } : {};

    const [products, total] = await Promise.all([
      Product.find(filter, projection)
        .sort(sortBy as any)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sellerId", "name avatar"),
      Product.countDocuments(filter),
    ]);

    res.json({ products, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Storefront feed: curated sections for the customer dashboard in one request
// @route   GET /api/products/feed
export const getProductFeed = async (_req: Request, res: Response) => {
  try {
    const active = { status: "active" } as const;
    const SECTION_SIZE = 4;
    const seller = ["sellerId", "name avatar"] as const;

    const [trending, newArrivals, categorySections, counts] = await Promise.all([
      Product.find({ ...active, downloadsCount: { $gt: 0 } })
        .sort({ downloadsCount: -1 }).limit(SECTION_SIZE).populate(...seller),
      Product.find(active).sort({ createdAt: -1 }).limit(SECTION_SIZE).populate(...seller),
      Promise.all(PRODUCT_CATEGORIES.map((category) =>
        Product.find({ ...active, category })
          .sort({ downloadsCount: -1, createdAt: -1 }).limit(SECTION_SIZE).populate(...seller)
      )),
      Product.aggregate<{ _id: string; count: number }>([
        { $match: active },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const byCategory = Object.fromEntries(PRODUCT_CATEGORIES.map((c, i) => [c, categorySections[i]]));
    const categoryCounts = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    const total = counts.reduce((sum, c) => sum + c.count, 0);

    res.json({ trending, newArrivals, byCategory, categoryCounts, total });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get a single active product
// @route   GET /api/products/:id
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Product not found" });

    const product = await Product.findOne({ _id: id, status: "active" }).populate("sellerId", "name avatar");
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    List the logged-in seller's own products (any status)
// @route   GET /api/products/mine?status=
export const getMyProducts = async (req: any, res: Response) => {
  try {
    const filter: Record<string, any> = { sellerId: req.user._id };
    const { status } = req.query;
    if (status && PRODUCT_STATUSES.includes(status)) filter.status = status;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Create a product (multipart: fields + "file" + optional "previewImage")
// @route   POST /api/products
export const createProduct = async (req: any, res: Response) => {
  const { file, preview } = getUploads(req);
  const cleanup = () => { removeFile(file?.path); removeFile(preview?.path); };

  if (!file) {
    cleanup();
    return res.status(400).json({ message: "Product file is required" });
  }
  if (preview && preview.size > MAX_PREVIEW_SIZE) {
    cleanup();
    return res.status(400).json({ message: "Preview image too large (max 5 MB)" });
  }

  try {
    const product = await Product.create({
      ...pickEditable(req.body),
      ...fileFields(file),
      previewImageUrl: preview ? `${PREVIEW_PUBLIC_PATH}/${preview.filename}` : undefined,
      sellerId: req.user._id,
    });
    res.status(201).json(await Product.findById(product._id)); // re-fetch so fileUrl stays hidden
  } catch (error) {
    cleanup();
    handleError(res, error);
  }
};

// @desc    Update own product (multipart; "file" / "previewImage" replace the existing ones)
// @route   PUT /api/products/:id
export const updateProduct = async (req: any, res: Response) => {
  const { file, preview } = getUploads(req);
  const cleanup = () => { removeFile(file?.path); removeFile(preview?.path); };

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      cleanup();
      return res.status(404).json({ message: "Product not found" });
    }
    if (preview && preview.size > MAX_PREVIEW_SIZE) {
      cleanup();
      return res.status(400).json({ message: "Preview image too large (max 5 MB)" });
    }

    const product = await Product.findOne({ _id: id, sellerId: req.user._id }).select("+fileUrl");
    if (!product) {
      cleanup();
      return res.status(404).json({ message: "Product not found" });
    }

    const oldFileUrl = product.fileUrl;
    const oldPreviewUrl = product.previewImageUrl;

    product.set(pickEditable(req.body));
    if (file) product.set(fileFields(file));
    if (preview) product.previewImageUrl = `${PREVIEW_PUBLIC_PATH}/${preview.filename}`;
    await product.save();

    // Only delete the old files once the new ones are safely saved
    if (file) removeFile(productFilePath(oldFileUrl));
    if (preview && oldPreviewUrl) removeFile(previewFilePath(oldPreviewUrl));

    res.json(await Product.findById(product._id));
  } catch (error) {
    cleanup();
    handleError(res, error);
  }
};

// @desc    Delete own product and its stored files
// @route   DELETE /api/products/:id
export const deleteProduct = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Product not found" });

    const product = await Product.findOne({ _id: id, sellerId: req.user._id }).select("+fileUrl");
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Buyers keep lifetime access, so a product that has sold can only be archived
    if (await hasAnySales(id)) {
      return res.status(409).json({
        code: "HAS_SALES",
        message: "This product has been purchased, so it can't be deleted. Archive it instead — it will be removed from the store but buyers keep their downloads.",
      });
    }

    await product.deleteOne();

    removeFile(productFilePath(product.fileUrl));
    if (product.previewImageUrl) removeFile(previewFilePath(product.previewImageUrl));

    res.json({ message: "Product deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Download the product file — the seller who owns it, or any buyer with a paid order
//          (buyers keep access even if the product is later archived)
// @route   GET /api/products/:id/file
export const downloadProductFile = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Product not found" });

    const product = await Product.findById(id).select("+fileUrl");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const isOwner = String(product.sellerId) === String(req.user._id);
    if (!isOwner && !(await hasPurchased(req.user._id, product._id as mongoose.Types.ObjectId))) {
      return res.status(403).json({ message: "Purchase this product to download it" });
    }

    const filePath = productFilePath(product.fileUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing on server" });

    res.download(filePath, product.fileName);
  } catch (error) {
    handleError(res, error);
  }
};
