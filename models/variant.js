import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  variant_id: String,
  product_id: String,

  variant_name: String,
  long_description: String,
  price: Number,
  images: Array,
  size: String,
  color: String,
  fragrance: String,
  shape: String,
  weight: Number,
  burn_time: Number,
  stock: Number,
  sku: Number
});

export default mongoose.model("Variant", variantSchema);