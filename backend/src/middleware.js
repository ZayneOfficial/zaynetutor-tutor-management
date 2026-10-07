import jwt from "jsonwebtoken";

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function requireAuth(req, res, next) {
  const token = req.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const tutorId = typeof claims?.sub === "string" ? Number(claims.sub) : NaN;
    if (!claims || typeof claims === "string" || !Number.isSafeInteger(tutorId) || tutorId < 1) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.tutorId = tutorId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.name === "ZodError") {
    return res.status(400).json({
      error: "Invalid request",
      details: error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    });
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "A record with those details already exists" });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(404).json({ error: "Related record not found" });
  }
  if (error.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ error: "Origin is not allowed" });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
}
