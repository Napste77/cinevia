/**
 * Corre `fn` sobre `items` con como máximo `limit` ejecuciones en vuelo al
 * mismo tiempo (en vez de Promise.all sin límite). Se usa en los upserts
 * masivos de discover/search: 20 items en paralelo contra MySQL remota
 * generaban deadlocks (Prisma P2034) al competir varias transacciones por
 * las mismas filas de Genre. Bajar la concurrencia real reduce muchísimo
 * la probabilidad de choque, y sigue siendo mucho más rápido que en serie.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
