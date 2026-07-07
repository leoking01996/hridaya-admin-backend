import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// CORS (Allow All)
// ======================
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// Logger
// ======================
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin);
  next();
});

// ======================
// Static Uploads
// ======================
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// ======================
// Routes
// ======================
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

// ======================
// MongoDB
// ======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    console.log("DB:", mongoose.connection.name);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB Error:", err.message);
  });