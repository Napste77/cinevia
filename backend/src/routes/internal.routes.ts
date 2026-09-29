import { Router } from "express";
import { JOBS, isJobName } from "../jobs";
import { runSeed } from "../services/seed";
import { requireSyncSecret } from "../middleware/internalAuth";
import { HttpError } from "../middleware/errorHandler";

export const internalRouter = Router();

/**
 * POST /internal/seed  (header X-Sync-Secret)
 * Carga el catálogo fijo (géneros, plataformas, países, disponibilidad).
 * Pensado para hostings sin acceso a terminal (ej. un free tier de
 * Render/Railway sin shell): se dispara una vez por HTTP en vez de
 * necesitar correr `npx prisma db seed` a mano. Es seguro repetirlo
 * (todo es upsert).
 */
internalRouter.post("/internal/seed", requireSyncSecret, async (_req, res) => {
  const result = await runSeed();
  res.json(result);
});

/**
 * POST/GET /internal/sync/:job  (header X-Sync-Secret, o el
 * Authorization: Bearer que agrega Vercel Cron — ver internalAuth.ts)
 *
 * En Render (proceso siempre vivo) esto se disparaba en background y
 * respondía 202 al toque, porque el job podía tardar varios minutos — más
 * de lo que cualquier cron por HTTP espera. Eso ya NO es seguro en
 * Vercel: una función serverless puede cortarse en cualquier momento
 * después de responder, así que "seguir corriendo después del response"
 * no tiene garantías. Ahora cada invocación corre UN LOTE acotado por
 * tiempo (ver TIME_BUDGET_MS en cada job) y espera el resultado real
 * antes de responder — Vercel Cron (vercel.json) llama a este mismo
 * endpoint cada pocos minutos hasta que el job devuelve `done: true`.
 */
async function runSyncJob(req: import("express").Request, res: import("express").Response) {
  const job = String(req.params.job);
  if (!isJobName(job)) throw new HttpError(400, `Job desconocido: ${job}`);

  const result = await JOBS[job]();
  console.log(`[internal/sync] "${job}":`, result);
  res.json(result);
}

internalRouter.post("/internal/sync/:job", requireSyncSecret, runSyncJob);
internalRouter.get("/internal/sync/:job", requireSyncSecret, runSyncJob);
