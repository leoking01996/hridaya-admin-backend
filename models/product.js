import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  product_id: String,
  name: String,
  type: String,
  short_description: String,
  price: Number,
  image: String
});

export default mongoose.model("Product", productSchema);