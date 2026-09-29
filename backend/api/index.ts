import { createApp } from "../src/app";

/**
 * Entry point para Vercel: una función serverless de Node que envuelve la
 * MISMA app Express que corre en src/server.ts (createApp), sin reescribir
 * rutas ni servicios. Vercel detecta que este archivo exporta un handler
 * `(req, res) => void` — un Express app cumple esa firma tal cual — y lo
 * invoca directo por request, sin necesidad de `.listen()` (eso lo maneja
 * el runtime de Vercel).
 *
 * Lo que NO entra acá a propósito: `startInternalScheduler()` (node-cron)
 * de src/server.ts. Un cron en memoria no tiene sentido en serverless —
 * no hay proceso persistente donde vivan esos timers. La sincronización
 * pasa a correr vía Vercel Cron pegándole a endpoints HTTP (ver
 * src/routes/sync.routes.ts y vercel.json de este mismo directorio).
 */
const app = createApp();

export default app;
