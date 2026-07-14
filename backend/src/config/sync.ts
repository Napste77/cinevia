/** Ventanas de "caché válido": mientras estén dentro de esto, no se vuelve a golpear TMDB. */
export const STALE_TTL_MS = {
  /** Detalle de un título (rating/popularity pueden cambiar seguido). */
  content: 1000 * 60 * 60 * 24, // 24h
  /** Cast/videos/imágenes cambian poco una vez que el título ya salió. */
  media: 1000 * 60 * 60 * 24 * 7, // 7 días
};

export function isStale(lastSync: Date | null, ttlMs: number): boolean {
  if (!lastSync) return true;
  return Date.now() - lastSync.getTime() > ttlMs;
}
