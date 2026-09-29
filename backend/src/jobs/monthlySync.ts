import { prisma } from "../db/prisma";
import { getOrFetchMovie } from "../services/movies";
import { getOrFetchTv } from "../services/tv";
import { syncContentMedia } from "../services/media";
import { sleep, TMDB_REQUEST_DELAY_MS } from "./rateLimit";
import { loadCursor, saveCursor, clearCursor, createDeadline } from "./cursor";

const PAGE_SIZE = 25;
const OLD_RECORD_DAYS = 60;
const JOB_NAME = "monthly";
const TIME_BUDGET_MS = 25_000; // ver nota en dailySync.ts (margen bajo timeout de cron/HTTP)

type MonthlyState =
  | { phase: "cleanup" }
  | { phase: "movies"; offset: number }
  | { phase: "tv"; offset: number }
  | { phase: "done" };

const INITIAL_STATE: MonthlyState = { phase: "cleanup" };

function staleWhere(cutoff: Date) {
  return { OR: [{ syncStatus: "error" as const }, { lastSync: { lt: cutoff } }, { lastSync: null }] };
}

/**
 * streaming_links/content_cast/videos/images/similar_content usan
 * (content_type, content_id) polimórfico en vez de una FK real (ver nota
 * de diseño en schema.prisma), así que su integridad no la garantiza la
 * base — hay que barrerla a mano. Borra filas "huérfanas" que quedaron
 * apuntando a una película/serie que ya no existe. Rápido (un puñado de
 * DELETE), corre entero en una sola invocación, sin necesidad de cursor.
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
 *
 * El offset de las fases movies/tv avanza por cada ítem EXAMINADO (haya
 * podido refrescarse o no) — si se avanzara solo por los que refrescan
 * bien, un título que sigue fallando siempre quedaría primero en el
 * resultado y una invocación entera podría quedarse reintentando el
 * mismo ítem sin nunca llegar al resto de la lista.
 */
export async function runMonthlySync() {
  const startedAt = Date.now();
  const deadline = createDeadline(TIME_BUDGET_MS);
  let state = await loadCursor<MonthlyState>(JOB_NAME, INITIAL_STATE);
  const cutoff = new Date(Date.now() - OLD_RECORD_DAYS * 24 * 60 * 60 * 1000);

  let orphansDeleted = 0;
  let moviesRefreshed = 0;
  let tvRefreshed = 0;

  while (!deadline() && state.phase !== "done") {
    if (state.phase === "cleanup") {
      orphansDeleted = await cleanupOrphans();
      state = { phase: "movies", offset: 0 };
      continue;
    }

    if (state.phase === "movies") {
      const movies = await prisma.movie.findMany({
        where: staleWhere(cutoff),
        orderBy: { id: "asc" },
        skip: state.offset,
        take: PAGE_SIZE,
      });
      if (movies.length === 0) {
        state = { phase: "tv", offset: 0 };
        continue;
      }
      let processed = 0;
      for (const movie of movies) {
        if (deadline()) break;
        try {
          const { movie: refreshed, detailBundle } = await getOrFetchMovie(movie.tmdbId);
          if (refreshed) await syncContentMedia("movie", refreshed.id, refreshed.tmdbId, detailBundle);
          moviesRefreshed++;
        } catch (e) {
          console.error(`Error en actualización completa de película ${movie.tmdbId}`, e);
        }
        await sleep(TMDB_REQUEST_DELAY_MS);
        processed++;
      }
      state = { phase: "movies", offset: state.offset + processed };
      continue;
    }

    if (state.phase === "tv") {
      const tvShows = await prisma.tVShow.findMany({
        where: staleWhere(cutoff),
        orderBy: { id: "asc" },
        skip: state.offset,
        take: PAGE_SIZE,
      });
      if (tvShows.length === 0) {
        state = { phase: "done" };
        continue;
      }
      let processed = 0;
      for (const tvShow of tvShows) {
        if (deadline()) break;
        try {
          const { tvShow: refreshed, detailBundle } = await getOrFetchTv(tvShow.tmdbId);
          if (refreshed) await syncContentMedia("tv", refreshed.id, refreshed.tmdbId, detailBundle);
          tvRefreshed++;
        } catch (e) {
          console.error(`Error en actualización completa de serie ${tvShow.tmdbId}`, e);
        }
        await sleep(TMDB_REQUEST_DELAY_MS);
        processed++;
      }
      state = { phase: "tv", offset: state.offset + processed };
      continue;
    }
  }

  const done = state.phase === "done";
  if (done) await clearCursor(JOB_NAME);
  else await saveCursor(JOB_NAME, state);

  return {
    job: JOB_NAME,
    done,
    durationMs: Date.now() - startedAt,
    orphansDeleted,
    moviesRefreshed,
    tvRefreshed,
    progress: state,
  };
}
