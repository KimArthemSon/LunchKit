import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  role: "customer" | "seller";
  otp?: string;
  otpExpires?: Date;
  needsOnboarding: boolean; // <--- ADD THIS
  // Where seller payouts are sent. Full details stay server-side; the API only returns them masked.
  payoutAccount?: {
    method: "bank" | "gcash" | "paypal";
    accountName: string;
    accountNumber: string; // Bank account no., GCash mobile no., or PayPal email
    bankName?: string;
    updatedAt: Date;
  };
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: ["customer", "seller"], default: "customer" },
    otp: { type: String },
    otpExpires: { type: Date },
    needsOnboarding: { type: Boolean, default: true }, // <--- ADD THIS
    payoutAccount: {
      method: { type: String, enum: ["bank", "gcash", "paypal"] },
      accountName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      bankName: { type: String, trim: true },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);