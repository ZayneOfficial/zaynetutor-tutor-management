import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pool from "./db.js";
import router from "./routes.js";
import { errorHandler, notFound } from "./middleware.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a secret of at least 32 characters");
}

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "32kb" }));
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
}));

app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`ZayneTutor API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing server`);
  server.close(async (error) => {
    try {
      await pool.end();
    } catch (poolError) {
      console.error(poolError);
      process.exitCode = 1;
    }
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
