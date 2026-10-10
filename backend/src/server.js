import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./db.js";
import router from "./routes.js";
import { errorHandler, notFound } from "./middleware.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a secret of at least 32 characters");
}

const app = express();
const port = Number(process.env.PORT || 3000);
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../");
const allowedOrigins = (process.env.WEB_ORIGIN || `http://localhost:${port}`)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));
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
app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(resolve(webRoot, "index.html"));
});
app.get(["/app.js", "/style.css"], express.static(webRoot, { index: false, dotfiles: "deny" }));
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
