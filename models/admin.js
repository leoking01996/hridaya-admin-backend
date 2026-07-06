import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },

    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);