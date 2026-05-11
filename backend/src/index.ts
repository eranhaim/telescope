import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import profilesRouter from "./routes/profiles";
import adminRouter from "./routes/admin";
import trackRouter from "./routes/track";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/profiles", profilesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/track", trackRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/telescope";
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start();
