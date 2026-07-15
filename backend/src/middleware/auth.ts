import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

function extractUserId(req: Request): number | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    return payload.userId;
  } catch {
    return null;
  }
}

/** Adjunta req.userId si viene un Bearer token válido, pero nunca bloquea. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = extractUserId(req);
  if (userId) req.userId = userId;
  next();
}

/** Igual que optionalAuth, pero corta con 401 si no hay usuario. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  req.userId = userId;
  next();
}
