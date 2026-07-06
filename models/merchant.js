import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema(
  {
    merchant_id: String,

    full_name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    national_id_number: String,
    national_id_image: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    is_verified: {
      type: Boolean,
      default: false,
    },

    otp: String,
    otp_expires: Date,
  },
  { timestamps: true }
);

// ✅ ES MODULE EXPORT
const Merchant = mongoose.model("Merchant", merchantSchema);
export default Merchant;