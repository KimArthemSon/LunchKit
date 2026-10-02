import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db";
import passport from "./config/passport";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import cartRoutes from "./routes/cartRoutes";
import orderRoutes from "./routes/orderRoutes";
import sellerRoutes from "./routes/sellerRoutes";
import { PREVIEW_DIR, PREVIEW_PUBLIC_PATH } from "./middleware/uploadMiddleware";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Public preview images (product files stay private — served only via /api/products/:id/file)
app.use(PREVIEW_PUBLIC_PATH, express.static(PREVIEW_DIR));

// Routes
app.get("/", (req, res) => res.json({ message: "LaunchKit API is running! " }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/seller", sellerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));