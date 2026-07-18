import { prisma } from "../db/prisma";
import { syncContentMedia } from "../services/media";
import { STALE_TTL_MS, isStale } from "../config/sync";
import { sleep, TMDB_REQUEST_DELAY_MS } from "./rateLimit";

const BATCH_SIZE = 100;

/**
 * Job semanal: "información del cast, trailers, imágenes" (spec). Toma
 * los títulos más populares cuyo `last_media_sync` nunca se hizo o quedó
 * viejo y les vuelve a sincronizar cast/video/imágenes/recomendaciones.
 */
export async function runWeeklySync() {
  const startedAt = Date.now();
  let moviesSynced = 0;
  let tvSynced = 0;

  const movies = await prisma.movie.findMany({
    orderBy: { popularity: "desc" },
    take: BATCH_SIZE,
  });
  for (const movie of movies) {
    if (!isStale(movie.lastMediaSync, STALE_TTL_MS.media)) continue;
    try {
      await syncContentMedia("movie", movie.id, movie.tmdbId);
      moviesSynced++;
    } catch (e) {
      console.error(`Error sincronizando media de la película ${movie.tmdbId}`, e);
    }
    await sleep(TMDB_REQUEST_DELAY_MS);
  }

  const tvShows = await prisma.tVShow.findMany({
    orderBy: { popularity: "desc" },
    take: BATCH_SIZE,
  });
  for (const tvShow of tvShows) {
    if (!isStale(tvShow.lastMediaSync, STALE_TTL_MS.media)) continue;
    try {
      await syncContentMedia("tv", tvShow.id, tvShow.tmdbId);
      tvSynced++;
    } catch (e) {
      console.error(`Error sincronizando media de la serie ${tvShow.tmdbId}`, e);
    }
    await sleep(TMDB_REQUEST_DELAY_MS);
  }

  return { job: "weekly", durationMs: Date.now() - startedAt, moviesSynced, tvSynced };
}
