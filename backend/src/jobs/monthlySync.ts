import { prisma } from "../db/prisma";
import { getOrFetchMovie } from "../services/movies";
import { getOrFetchTv } from "../services/tv";
import { syncContentMedia } from "../services/media";
import { sleep, TMDB_REQUEST_DELAY_MS } from "./rateLimit";

const FULL_REFRESH_BATCH_SIZE = 200;
const OLD_RECORD_DAYS = 60;

/**
 * Limpieza: streaming_links/content_cast/videos/images/similar_content
 * usan (content_type, content_id) polimórfico en vez de una FK real (ver
 * nota de diseño en schema.prisma), así que su integridad no la garantiza
 * MySQL — hay que barrerla a mano. Borra filas "huérfanas" que quedaron
 * apuntando a una película/serie que ya no existe.
 */
async function cleanupOrphans() {
  const tables = ["streaming_links", "content_cast", "videos", "images"];
  let deleted = 0;
  for (const table of tables) {
    const res = await prisma.$executeRawUnsafe(
      `DELETE FROM ${table} WHERE content_type = 'movie' AND content_id NOT IN (SELECT id FROM movies)`
    );
    const res2 = await prisma.$executeRawUnsafe(
      `DELETE FROM ${table} WHERE content_type = 'tv' AND content_id NOT IN (SELECT id FROM tv_shows)`
    );
    deleted += Number(res) + Number(res2);
  }

  const simA1 = await prisma.$executeRawUnsafe(
    `DELETE FROM similar_content WHERE content_a_type = 'movie' AND content_a_id NOT IN (SELECT id FROM movies)`
  );
  const simA2 = await prisma.$executeRawUnsafe(
    `DELETE FROM similar_content WHERE content_a_type = 'tv' AND content_a_id NOT IN (SELECT id FROM tv_shows)`
  );
  const simB1 = await prisma.$executeRawUnsafe(
    `DELETE FROM similar_content WHERE content_b_type = 'movie' AND content_b_id NOT IN (SELECT id FROM movies)`
  );
  const simB2 = await prisma.$executeRawUnsafe(
    `DELETE FROM similar_content WHERE content_b_type = 'tv' AND content_b_id NOT IN (SELECT id FROM tv_shows)`
  );
  deleted += Number(simA1) + Number(simA2) + Number(simB1) + Number(simB2);

  return deleted;
}

/**
 * Job mensual: "limpieza, validación, actualización completa de registros
 * antiguos" (spec). Revalida todo lo que quedó en sync_status=error y
 * refresca por completo (contenido + media) lo que no se toca hace más
 * de OLD_RECORD_DAYS.
 */
export async function runMonthlySync() {
  const startedAt = Date.now();
  const orphansDeleted = await cleanupOrphans();

  const cutoff = new Date(Date.now() - OLD_RECORD_DAYS * 24 * 60 * 60 * 1000);
  const staleMovies = await prisma.movie.findMany({
    where: { OR: [{ syncStatus: "error" }, { lastSync: { lt: cutoff } }, { lastSync: null }] },
    take: FULL_REFRESH_BATCH_SIZE,
  });
  const staleTv = await prisma.tVShow.findMany({
    where: { OR: [{ syncStatus: "error" }, { lastSync: { lt: cutoff } }, { lastSync: null }] },
    take: FULL_REFRESH_BATCH_SIZE,
  });

  let moviesRefreshed = 0;
  for (const movie of staleMovies) {
    try {
      const { movie: refreshed, detailBundle } = await getOrFetchMovie(movie.tmdbId);
      if (refreshed) await syncContentMedia("movie", refreshed.id, refreshed.tmdbId, detailBundle);
      moviesRefreshed++;
    } catch (e) {
      console.error(`Error en actualización completa de película ${movie.tmdbId}`, e);
    }
    await sleep(TMDB_REQUEST_DELAY_MS);
  }

  let tvRefreshed = 0;
  for (const tvShow of staleTv) {
    try {
      const { tvShow: refreshed, detailBundle } = await getOrFetchTv(tvShow.tmdbId);
      if (refreshed) await syncContentMedia("tv", refreshed.id, refreshed.tmdbId, detailBundle);
      tvRefreshed++;
    } catch (e) {
      console.error(`Error en actualización completa de serie ${tvShow.tmdbId}`, e);
    }
    await sleep(TMDB_REQUEST_DELAY_MS);
  }

  return {
    job: "monthly",
    durationMs: Date.now() - startedAt,
    orphansDeleted,
    moviesRefreshed,
    tvRefreshed,
  };
}
