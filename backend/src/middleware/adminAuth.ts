import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function jwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}

export function generateAdminToken(): string {
  const secret = jwtSecret();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ role: "admin" }, secret, { expiresIn: "24h" });
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = header.slice(7);
    const secret = jwtSecret();
    if (!secret) {
      res.status(503).json({ error: "Admin authentication is not configured" });
      return;
    }
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || payload.role !== "admin") {
      res.status(401).json({ error: "Invalid admin token" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
