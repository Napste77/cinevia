/**
 * El Home dispara muchos requests en paralelo (tendencias + cada
 * plataforma + cada género) y varios pueden intentar upsertear el MISMO
 * título casi al mismo tiempo (ej. una película popular que aparece en
 * "Netflix" y en "Acción" a la vez) — MySQL puede resolver eso como un
 * deadlock/write-conflict (Prisma P2034), que es transitorio por
 * definición. Reintentar un par de veces alcanza para que el segundo
 * intento tome el lock que el primero ya liberó.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (e?.code !== "P2034") throw e;
      await new Promise((resolve) => setTimeout(resolve, 50 * (i + 1)));
    }
  }
  throw lastError;
}
