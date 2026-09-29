import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

/**
 * Protege los endpoints de /internal/*: solo deben poder dispararlos
 * nuestros propios jobs, nunca el frontend ni un cliente público. Acepta
 * dos formas de autenticarse:
 * - Header `X-Sync-Secret`: cron externo (cron-job.org) o disparo manual.
 * - Header `Authorization: Bearer <CRON_SECRET>`: el que agrega Vercel
 *   automáticamente en cada invocación de un cron definido en
 *   vercel.json — así el mismo endpoint sirve para ambos casos sin
 *   duplicar rutas.
 */
export function requireSyncSecret(req: Request, res: Response, next: NextFunction) {
  const providedSyncSecret = req.header("x-sync-secret");
  if (providedSyncSecret && providedSyncSecret === env.syncSecret) {
    next();
    return;
  }

  const authHeader = req.header("authorization");
  if (env.cronSecret && authHeader === `Bearer ${env.cronSecret}`) {
    next();
    return;
  }

  res.status(401).json({ error: "No autorizado" });
}
