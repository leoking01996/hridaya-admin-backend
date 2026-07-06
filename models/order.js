import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    order_no: String,
    user_id: String,

    items: Array,

    subtotal: Number,
    discount: Number,
    shipping_charge: Number,
    total_amount: Number,

    coupon_code: String,
    payment_method: String,
    payment_status: String,

    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;