import { prisma } from "../db/prisma";
import { syncContentMedia } from "../services/media";
import { STALE_TTL_MS, isStale } from "../config/sync";
import { sleep, TMDB_REQUEST_DELAY_MS } from "./rateLimit";
import { loadCursor, saveCursor, clearCursor, createDeadline } from "./cursor";

const PAGE_SIZE = 50;
const JOB_NAME = "weekly";
const TIME_BUDGET_MS = 45_000; // ver nota de margen en dailySync.ts

type WeeklyState = { phase: "movies"; offset: number } | { phase: "tv"; offset: number } | { phase: "done" };

const INITIAL_STATE: WeeklyState = { phase: "movies", offset: 0 };

/**
 * Job semanal: "información del cast, trailers, imágenes" (spec). Barre
 * TODO el catálogo (orden estable por id) buscando títulos cuyo
 * `last_media_sync` nunca se hizo o quedó viejo, y les vuelve a
 * sincronizar cast/video/imágenes/recomendaciones — los que ya están al
 * día se saltan sin gastar una llamada a TMDB.
 *
 * Igual que dailySync: corre en lotes acotados por tiempo, retomando
 * exactamente donde quedó la invocación anterior (SyncCursor) hasta
 * terminar la pasada completa, momento en el que se limpia el cursor
 * (la próxima vez que Vercel Cron lo dispare, arranca una pasada nueva).
 * El offset avanza solo por los ítems que de verdad se llegaron a
 * revisar en esta invocación — si el deadline corta a mitad de una
 * página, la próxima invocación retoma desde ahí, no desde el final de
 * toda la página.
 */
export async function runWeeklySync() {
  const startedAt = Date.now();
  const deadline = createDeadline(TIME_BUDGET_MS);
  let state = await loadCursor<WeeklyState>(JOB_NAME, INITIAL_STATE);

  let moviesSynced = 0;
  let tvSynced = 0;
  let moviesChecked = 0;
  let tvChecked = 0;

  while (!deadline() && state.phase !== "done") {
    if (state.phase === "movies") {
      const movies = await prisma.movie.findMany({
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
        moviesChecked++;
        if (isStale(movie.lastMediaSync, STALE_TTL_MS.media)) {
          try {
            await syncContentMedia("movie", movie.id, movie.tmdbId);
            moviesSynced++;
          } catch (e) {
            console.error(`Error sincronizando media de la película ${movie.tmdbId}`, e);
          }
          await sleep(TMDB_REQUEST_DELAY_MS);
        }
        processed++;
      }
      state = { phase: "movies", offset: state.offset + processed };
      continue;
    }

    if (state.phase === "tv") {
      const tvShows = await prisma.tVShow.findMany({
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
        tvChecked++;
        if (isStale(tvShow.lastMediaSync, STALE_TTL_MS.media)) {
          try {
            await syncContentMedia("tv", tvShow.id, tvShow.tmdbId);
            tvSynced++;
          } catch (e) {
            console.error(`Error sincronizando media de la serie ${tvShow.tmdbId}`, e);
          }
          await sleep(TMDB_REQUEST_DELAY_MS);
        }
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
    moviesSynced,
    tvSynced,
    moviesChecked,
    tvChecked,
    progress: state,
  };
}
