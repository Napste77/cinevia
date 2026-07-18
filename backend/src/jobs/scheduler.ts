import cron from "node-cron";
import { JOBS } from "./index";

/**
 * Scheduler interno opcional (ENABLE_INTERNAL_CRON=true): útil en un VPS
 * donde el proceso del server corre siempre (PM2/systemd) y puede
 * autoprogramarse, sin depender de un cron externo. En hosting compartido
 * dejar esto apagado y usar /internal/sync/:job desde un Cron Job de
 * hPanel o un cron externo en su lugar (ver README de deploy).
 */
export function startInternalScheduler() {
  // Diario a las 03:00 (baja demanda).
  cron.schedule("0 3 * * *", () => runJobSafely("daily"));
  // Semanal, lunes 04:00.
  cron.schedule("0 4 * * 1", () => runJobSafely("weekly"));
  // Mensual, día 1 a las 05:00.
  cron.schedule("0 5 1 * *", () => runJobSafely("monthly"));

  console.log("[scheduler] cron interno habilitado (daily/weekly/monthly)");
}

async function runJobSafely(name: keyof typeof JOBS) {
  try {
    console.log(`[scheduler] arrancando job "${name}"...`);
    const result = await JOBS[name]();
    console.log(`[scheduler] job "${name}" terminado:`, result);
  } catch (e) {
    console.error(`[scheduler] job "${name}" falló:`, e);
  }
}
