import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

/**
 * Protege los endpoints de /internal/*: solo deben poder dispararlos
 * nuestros propios jobs (cron de un VPS, un Cron Job de hPanel apuntando
 * a esta URL, o un cron externo tipo cron-job.org), nunca el frontend ni
 * un cliente público.
 */
export function requireSyncSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-sync-secret");
  if (!provided || provided !== env.syncSecret) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}
