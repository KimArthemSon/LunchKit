import mongoose, { Document, Schema } from "mongoose";

export const PRODUCT_CATEGORIES = ["Mockups", "Graphics", "Videos", "Templates", "Bundles"] as const;
export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  sellerId: mongoose.Types.ObjectId; // Link to the User who owns this asset
  fileUrl: string; // Stored filename inside uploads/products — never exposed in public listings
  fileName: string; // Original filename, used for the download
  previewImageUrl?: string; // Public path, e.g. /uploads/previews/<id>.png
  fileType?: string; // e.g. "zip", "psd", "fig", "mp4"
  fileSize?: number; // In bytes
  status: ProductStatus;
  downloadsCount: number;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileUrl: { type: String, required: true, select: false },
    fileName: { type: String, required: true },
    previewImageUrl: { type: String },
    fileType: { type: String, lowercase: true, trim: true },
    fileSize: { type: Number, min: 0 },
    status: { type: String, enum: PRODUCT_STATUSES, default: "draft" },
    downloadsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Marketplace browsing: filter by status/category, sort by newest, price or popularity
ProductSchema.index({ status: 1, category: 1, createdAt: -1 });
ProductSchema.index({ status: 1, price: 1 });
ProductSchema.index({ status: 1, downloadsCount: -1 });
// Seller dashboard: "my products" filtered by status
ProductSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
// Full-text search, title weighted higher than description
ProductSchema.index({ title: "text", description: "text" }, { weights: { title: 5, description: 1 } });

export default mongoose.model<IProduct>("Product", ProductSchema);
