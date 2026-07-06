import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// CORS Configuration
// ===============================
const allowedOrigins = [
  "http://localhost:5173",           // Local Vite
  "http://localhost:3000",           // Local CRA (optional)
  "https://your-admin.netlify.app",  // Replace with Admin URL
  "https://your-customer.netlify.app"// Replace with Customer URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman, mobile apps, server-to-server requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS Not Allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Logger
app.use((req, res, next) => {
  console.log(`🌍 ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("API Running");
});

// MongoDB Connection
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
    console.error("❌ Mongo Error:", err.message);
  });