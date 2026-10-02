import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
};

// Helper to send response based on onboarding status
const sendAuthResponse = (res: Response, user: any) => {
  const token = generateToken(user._id);
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    needsOnboarding: user.needsOnboarding,
    token,
  });
};

// @desc    Register user (Standard)
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      role: role || "customer", 
      needsOnboarding: false // Standard signup chooses role immediately
    });

    sendAuthResponse(res, user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Login user
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });
   
    sendAuthResponse(res, user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Request OTP
export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });

    // Auto-create if new
    if (!user) {
      user = await User.create({
        name: email.split('@')[0],
        email,
        needsOnboarding: true, // <--- Flag for onboarding
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`\n🔐 [MVP OTP] Email: ${email} | Code: ${otp}\n`);
    res.status(200).json({ message: "Code sent!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || !user.otpExpires || new Date() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    sendAuthResponse(res, user); // Will include needsOnboarding flag
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Google Callback
export const googleCallback = async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.redirect(`${process.env.CLIENT_URL}/login?error=Google auth failed`);

    const token = generateToken(user._id);
    // Pass needsOnboarding in URL so frontend knows where to redirect
    const redirectUrl = user.needsOnboarding 
      ? `${process.env.CLIENT_URL}/auth/success?token=${token}&needsOnboarding=true`
      : `${process.env.CLIENT_URL}/auth/success?token=${token}`;
      
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=Server error`);
  }
};

// @desc    Complete Onboarding (Choose Role)
// @route   POST /api/auth/complete-onboarding
export const completeOnboarding = async (req: any, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== "customer" && role !== "seller") {
      return res.status(400).json({ message: "Choose either customer or seller" });
    }

    const user = await User.findById(req.user.id); // req.user comes from auth middleware
    if (!user) return res.status(404).json({ message: "User not found" });

    // A role is chosen once, during onboarding — this must not become a way to switch roles later
    if (!user.needsOnboarding) {
      return res.status(409).json({ message: "Your account type is already set" });
    }

    user.role = role;
    user.needsOnboarding = false;
    await user.save();

    sendAuthResponse(res, user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  // For stateless JWT, the backend just acknowledges the request.
  // The actual "logout" happens on the frontend when localStorage is cleared.
  res.status(200).json({ message: "Logged out successfully" });
};
// @desc    Get the logged-in user (used to restore the session, e.g. after Google sign-in)
// @route   GET /api/auth/me
export const getMe = (req: any, res: Response) => {
  const { _id, name, email, role, avatar, needsOnboarding } = req.user;
  res.json({ _id, name, email, role, avatar, needsOnboarding });
};
