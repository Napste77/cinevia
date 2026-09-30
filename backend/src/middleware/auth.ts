import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../db/prisma";

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

/**
 * Como requireAuth, pero además exige que el email esté verificado. Se usa
 * en las acciones de cuenta (Mi Lista, "Ya lo vi", calificar, comentar):
 * un usuario recién registrado puede navegar, pero no puede usar esto
 * hasta clickear el link del email. Devuelve 403 con code
 * "EMAIL_NOT_VERIFIED" para que el frontend muestre el aviso correcto.
 */
export async function requireVerified(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  if (!user.emailVerified) {
    res.status(403).json({
      error: "Verificá tu email para usar esta función.",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }
  req.userId = userId;
  next();
}
