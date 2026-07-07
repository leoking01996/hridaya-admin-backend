import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors({
  // origin: "http://localhost:5173",
  origin: "  https://hridaya-admin-backend-4.onrender.com",

  credentials: true
}));

app.use(express.json());


// 🔥 serve uploads folder (IMPORTANT FIX)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 🔥 GLOBAL LOGGER (VERY IMPORTANT)
app.use((req, res, next) => {
  console.log("🌍 REQUEST:", req.method, req.url);
  next();
});

// routes
app.use("/api/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API Running");
});

// connect DB + start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    console.log("DB:", mongoose.connection.name);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ Mongo Error:", err.message);
  });