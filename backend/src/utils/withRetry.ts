/**
 * El Home dispara muchos requests en paralelo (tendencias + cada
 * plataforma + cada género) y varios pueden intentar upsertear el MISMO
 * título casi al mismo tiempo (ej. una película popular que aparece en
 * "Netflix" y en "Acción" a la vez) — MySQL puede resolver eso como un
 * deadlock/write-conflict (Prisma P2034), que es transitorio por
 * definición. Reintentar alcanza para que el siguiente intento tome el
 * lock que el anterior ya liberó.
 *
 * `discoverMovies`/`discoverTv`/`search` además acotan la concurrencia de
 * upserts en paralelo (ver utils/concurrency.ts) para que esto sea la
 * última red de seguridad y no el mecanismo principal: con 3 intentos y
 * 50-150ms de espera fija, un lote de ~20 transacciones reintentando casi
 * al mismo tiempo podía seguir chocando entre sí y agotar los reintentos
 * (500 al cliente). Más intentos + backoff con jitter reduce esa chance
 * de choque sincronizado entre retries.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (e?.code !== "P2034") throw e;
      const base = 75 * (i + 1);
      const jitter = Math.random() * 75;
      await new Promise((resolve) => setTimeout(resolve, base + jitter));
    }
  }
  throw lastError;
}
