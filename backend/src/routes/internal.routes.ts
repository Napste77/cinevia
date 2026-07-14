import { Router } from "express";
import { JOBS, isJobName } from "../jobs";
import { requireSyncSecret } from "../middleware/internalAuth";
import { HttpError } from "../middleware/errorHandler";

export const internalRouter = Router();

/**
 * POST /internal/sync/:job  (header X-Sync-Secret)
 * Pensado para hostings donde no se puede dejar un proceso node corriendo
 * un cron propio (ej. Hostinger compartido): un Cron Job de hPanel, o un
 * cron externo gratuito (cron-job.org), pega acá en vez de correr un
 * script directo.
 */
internalRouter.post("/internal/sync/:job", requireSyncSecret, async (req, res) => {
  const job = String(req.params.job);
  if (!isJobName(job)) throw new HttpError(400, `Job desconocido: ${job}`);

  const result = await JOBS[job]();
  res.json(result);
});
