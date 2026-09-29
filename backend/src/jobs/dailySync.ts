import { prisma } from "../db/prisma";
import { tmdbDiscover } from "../providers/tmdb";
import { upsertMovie } from "../services/movies";
import { upsertTv } from "../services/tv";
import { PLATFORMS } from "../data/platforms";
import { TMDB_GENRES } from "../data/genres";
import { env } from "../config/env";
import { sleep, TMDB_REQUEST_DELAY_MS } from "./rateLimit";
import { loadCursor, saveCursor, clearCursor, createDeadline } from "./cursor";

const TRENDING_PAGES = 3;
const PLATFORM_PAGES = 1;
const GENRE_PAGES = 1;
const JOB_NAME = "daily";

// Margen real bajo maxDuration de vercel.json (60s): deja tiempo de sobra
// para que la invocación termine de escribir y responda antes de que
// Vercel corte la ejecución de golpe a mitad de un upsert.
const TIME_BUDGET_MS = 45_000;

type DailyState =
  | { phase: "movies"; page: number }
  | { phase: "tv"; page: number }
  | { phase: "platforms"; platformIndex: number; page: number }
  | { phase: "genres"; genreIndex: number; page: number }
  | { phase: "done" };

const INITIAL_STATE: DailyState = { phase: "movies", page: 1 };

/**
 * Job diario: "tendencias globales, nuevos estrenos, cambios de
 * puntuación, nuevos posters, cambios de plataformas" (spec). Vuelve a
 * pedir discover ordenado por popularidad -> upsert refresca rating,
 * popularity, poster/backdrop y (re)descubre estrenos nuevos que hayan
 * entrado al top. También refresca, por cada plataforma y género
 * conocido, qué títulos aparecen ahí hoy.
 *
 * Corre en lotes acotados por tiempo (ver TIME_BUDGET_MS): cada
 * invocación retoma donde quedó la anterior (SyncCursor) y avanza todo lo
 * que pueda antes de guardar su progreso y cortar. Vercel Cron llama a
 * este job cada pocos minutos hasta que devuelve `done: true`. Una falla
 * de TMDB a mitad de camino (rate limit, timeout, 5xx) no tira abajo el
 * progreso ya hecho en esta invocación: se guarda el cursor tal como
 * estaba y la próxima invocación retoma desde ahí, en vez de un 500 que
 * además perdería de vista en qué fase se había quedado.
 */
export async function runDailySync() {
  const startedAt = Date.now();
  const deadline = createDeadline(TIME_BUDGET_MS);
  let state = await loadCursor<DailyState>(JOB_NAME, INITIAL_STATE);
  let moviesUpserted = 0;
  let tvUpserted = 0;
  let lastError: string | null = null;

  try {
    while (!deadline() && state.phase !== "done") {
      if (state.phase === "movies") {
        const data = await tmdbDiscover({ mediaType: "movie", watchRegion: env.defaultCountry, page: state.page });
        for (const raw of data.results) {
          await upsertMovie(raw);
          moviesUpserted++;
        }
        await sleep(TMDB_REQUEST_DELAY_MS);
        state = state.page >= TRENDING_PAGES ? { phase: "tv", page: 1 } : { phase: "movies", page: state.page + 1 };
        continue;
      }

      if (state.phase === "tv") {
        const data = await tmdbDiscover({ mediaType: "tv", watchRegion: env.defaultCountry, page: state.page });
        for (const raw of data.results) {
          await upsertTv(raw);
          tvUpserted++;
        }
        await sleep(TMDB_REQUEST_DELAY_MS);
        state =
          state.page >= TRENDING_PAGES
            ? { phase: "platforms", platformIndex: 0, page: 1 }
            : { phase: "tv", page: state.page + 1 };
        continue;
      }

      if (state.phase === "platforms") {
        if (state.platformIndex >= PLATFORMS.length) {
          state = { phase: "genres", genreIndex: 0, page: 1 };
          continue;
        }
        const platform = PLATFORMS[state.platformIndex];
        const platformRow = await prisma.platform.findUnique({ where: { slug: platform.slug } });
        if (platformRow) {
          const data = await tmdbDiscover({
            mediaType: "movie",
            watchRegion: env.defaultCountry,
            withWatchProviders: platform.tmdbId,
            page: state.page,
          });
          for (const raw of data.results) {
            const movie = await upsertMovie(raw);
            await prisma.streamingLink.upsert({
              where: {
                content_platform_country: {
                  contentType: "movie",
                  contentId: movie.id,
                  platformId: platformRow.id,
                  country: env.defaultCountry,
                },
              },
              update: {},
              create: {
                contentType: "movie",
                contentId: movie.id,
                platformId: platformRow.id,
                country: env.defaultCountry,
                verified: false,
              },
            });
          }
          await sleep(TMDB_REQUEST_DELAY_MS);
        }
        state =
          state.page >= PLATFORM_PAGES
            ? { phase: "platforms", platformIndex: state.platformIndex + 1, page: 1 }
            : { phase: "platforms", platformIndex: state.platformIndex, page: state.page + 1 };
        continue;
      }

      if (state.phase === "genres") {
        if (state.genreIndex >= TMDB_GENRES.length) {
          state = { phase: "done" };
          continue;
        }
        const genre = TMDB_GENRES[state.genreIndex];
        const data = await tmdbDiscover({
          mediaType: "movie",
          watchRegion: env.defaultCountry,
          withGenres: genre.tmdbId,
          page: state.page,
        });
        for (const raw of data.results) {
          await upsertMovie(raw);
        }
        await sleep(TMDB_REQUEST_DELAY_MS);
        state =
          state.page >= GENRE_PAGES
            ? { phase: "genres", genreIndex: state.genreIndex + 1, page: 1 }
            : { phase: "genres", genreIndex: state.genreIndex, page: state.page + 1 };
        continue;
      }
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    console.error(`[${JOB_NAME}] error, se retoma en la próxima invocación`, e);
  }

  const done = state.phase === "done";
  if (done) await clearCursor(JOB_NAME);
  else await saveCursor(JOB_NAME, state);

  return {
    job: JOB_NAME,
    done,
    durationMs: Date.now() - startedAt,
    moviesUpserted,
    tvUpserted,
    progress: state,
    error: lastError,
  };
}
