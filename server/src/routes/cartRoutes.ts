import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getCart, addCartItem, removeCartItem, clearCart } from "../controllers/cartController";

const router = express.Router();

router.use(protect);

router.get("/", getCart);
router.delete("/", clearCart);
router.post("/items", addCartItem);
router.delete("/items/:productId", removeCartItem);

export default router;
