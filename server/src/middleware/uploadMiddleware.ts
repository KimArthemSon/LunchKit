import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Stored under <server>/uploads. Product files are private (served only through
// an authorized download route); preview images are public via express.static.
export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
export const PRODUCT_FILES_DIR = path.join(UPLOAD_ROOT, "products");
export const PREVIEW_DIR = path.join(UPLOAD_ROOT, "previews");
export const PREVIEW_PUBLIC_PATH = "/uploads/previews";

for (const dir of [PRODUCT_FILES_DIR, PREVIEW_DIR]) fs.mkdirSync(dir, { recursive: true });

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
export const MAX_PREVIEW_SIZE = 5 * 1024 * 1024; // 5 MB, checked in the controller

const ALLOWED_FILE_EXTENSIONS = new Set([
  ".zip", ".rar", ".7z", ".pdf", ".ppt", ".pptx", ".key", ".fig", ".sketch", ".xd",
  ".psd", ".ai", ".eps", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".mp4", ".mov", ".webm", ".aep", ".prproj", ".mogrt", ".ttf", ".otf", ".json",
]);
const ALLOWED_PREVIEW_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, file.fieldname === "previewImage" ? PREVIEW_DIR : PRODUCT_FILES_DIR),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "previewImage") {
      return ALLOWED_PREVIEW_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(new Error("Preview image must be PNG, JPEG, WebP or GIF"));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    return ALLOWED_FILE_EXTENSIONS.has(ext)
      ? cb(null, true)
      : cb(new Error(`File type "${ext || "unknown"}" is not allowed`));
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "previewImage", maxCount: 1 },
]);

// Wraps multer so upload errors come back as JSON 400s instead of Express's default HTML 500
export const uploadProductFiles = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (err: unknown) => {
    if (!err) return next();
    const message =
      err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "File too large (max 500 MB)"
        : (err as Error).message;
    res.status(400).json({ message });
  });
};
