import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getPaymentConfig, checkout, getMyOrders, getLibrary, getOrder
} from "../controllers/orderController";

const router = express.Router();

router.get("/payment-config", getPaymentConfig);

router.use(protect);

router.post("/checkout", checkout);
router.get("/", getMyOrders);
router.get("/library", getLibrary); // Must be registered before "/:id"
router.get("/:id", getOrder);

export default router;
