import express from "express";
import { protect, sellerOnly } from "../middleware/authMiddleware";
import { getSales, getEarnings, updatePayoutAccount, requestPayout } from "../controllers/sellerController";
import { getOverview } from "../controllers/sellerDashboardController";

const router = express.Router();

router.use(protect, sellerOnly);

router.get("/overview", getOverview);
router.get("/sales", getSales);
router.get("/earnings", getEarnings);
router.put("/payout-account", updatePayoutAccount);
router.post("/payouts", requestPayout);

export default router;
