import { Redis } from "@upstash/redis";

/**
 * Caché compartida entre invocaciones. En Render (proceso siempre vivo)
 * una `Map` en memoria del módulo alcanzaba — pero en Vercel cada
 * invocación serverless puede correr en una instancia nueva, así que esa
 * memoria no sobrevive entre requests (la caché se "perdía" todo el
 * tiempo, sin avisar, y volvíamos a pagar el viaje a TMDB/DB que la
 * caché existía justamente para evitar).
 *
 * Con `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configuradas,
 * esto usa Redis de verdad (compartido entre todas las invocaciones). Sin
 * ellas (dev local, o si Upstash no está configurado todavía) cae a una
 * `Map` en memoria del proceso — sigue andando, solo que sin compartir
 * caché entre instancias, exactamente como se comportaba antes.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const memoryFallback = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Devuelve el valor cacheado si existe y no venció; si no, corre `fetcher`,
 * guarda el resultado con el TTL indicado y lo devuelve. Un error de Redis
 * (timeout, credenciales mal puestas, etc.) nunca debe tirar abajo un
 * request — se loguea y se sigue como si no hubiera caché.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) return cached;
    } catch (e) {
      console.error(`[cache] error leyendo Redis (key=${key})`, e);
    }

    const fresh = await fetcher();
    try {
      await redis.set(key, fresh, { ex: ttlSeconds });
    } catch (e) {
      console.error(`[cache] error escribiendo Redis (key=${key})`, e);
    }
    return fresh;
  }

  const cached = memoryFallback.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  const fresh = await fetcher();
  memoryFallback.set(key, { data: fresh, expiresAt: Date.now() + ttlSeconds * 1000 });
  return fresh;
}

/** Borra una entrada puntual (ej. tras insertar streamingLinks nuevos). */
export async function invalidateCache(key: string): Promise<void> {
  memoryFallback.delete(key);
  if (redis) {
    try {
      await redis.del(key);
    } catch (e) {
      console.error(`[cache] error invalidando Redis (key=${key})`, e);
    }
  }
}
