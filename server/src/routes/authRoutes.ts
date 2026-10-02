import express from "express";
import passport from "passport";
import { protect } from "../middleware/authMiddleware";
import { 
  registerUser, loginUser, googleCallback, requestOtp, verifyOtp, completeOnboarding, logoutUser, getMe
} from "../controllers/authController";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/complete-onboarding", protect, completeOnboarding);
router.post("/logout", logoutUser); // <-- Add this route
router.get("/me", protect, getMe);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false }), googleCallback);

export default router;