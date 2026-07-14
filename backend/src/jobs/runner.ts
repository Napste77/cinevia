import "dotenv/config";
import { JOBS, isJobName } from "./index";

/**
 * CLI para disparar un job de sincronización a mano o desde un crontab
 * real (VPS): `npm run sync -- daily|weekly|monthly`.
 */
async function main() {
  const name = process.argv[2];
  if (!name || !isJobName(name)) {
    console.error(`Uso: npm run sync -- <${Object.keys(JOBS).join("|")}>`);
    process.exit(1);
  }

  console.log(`[sync] arrancando job "${name}"...`);
  const result = await JOBS[name]();
  console.log(`[sync] terminado:`, result);
  process.exit(0);
}

main().catch((e) => {
  console.error("[sync] falló:", e);
  process.exit(1);
});
