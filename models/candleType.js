import mongoose from "mongoose";

const candleTypeSchema = new mongoose.Schema(
  {
    typename: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } 
);

export default mongoose.model("CandleType", candleTypeSchema);