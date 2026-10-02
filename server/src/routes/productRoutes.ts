import express from "express";
import { protect, sellerOnly } from "../middleware/authMiddleware";
import { uploadProductFiles } from "../middleware/uploadMiddleware";
import {
  getProducts, getProductFeed, getProductById, getMyProducts, createProduct, updateProduct, deleteProduct, downloadProductFile
} from "../controllers/productController";

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/feed", getProductFeed);

// Seller — "/feed" and "/mine" must be registered before "/:id"
router.get("/mine", protect, sellerOnly, getMyProducts);
router.post("/", protect, sellerOnly, uploadProductFiles, createProduct);
router.put("/:id", protect, sellerOnly, uploadProductFiles, updateProduct);
router.delete("/:id", protect, sellerOnly, deleteProduct);
router.get("/:id/file", protect, downloadProductFile); // Owner or buyer (checked in controller)

router.get("/:id", getProductById);

export default router;
