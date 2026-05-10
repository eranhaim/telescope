import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = () => process.env.JWT_SECRET || "fallback-secret";

export function generateAdminToken(): string {
  return jwt.sign({ role: "admin" }, JWT_SECRET(), { expiresIn: "24h" });
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = header.slice(7);
    jwt.verify(token, JWT_SECRET());
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
