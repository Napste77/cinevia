import { prisma } from "../db/prisma";
import { tmdbDiscover } from "../providers/tmdb";
import { upsertMovie } from "../services/movies";
import { upsertTv } from "../services/tv";
import { PLATFORMS } from "../data/platforms";
import { TMDB_GENRES } from "../data/genres";
import { env } from "../config/env";
import { sleep, TMDB_REQUEST_DELAY_MS } from "./rateLimit";

const TRENDING_PAGES = 3;
const PLATFORM_PAGES = 1;
const GENRE_PAGES = 1;

/**
 * Job diario: "tendencias globales, nuevos estrenos, cambios de
 * puntuación, nuevos posters, cambios de plataformas" (spec). Vuelve a
 * pedir discover ordenado por popularidad -> upsert refresca rating,
 * popularity, poster/backdrop y (re)descubre estrenos nuevos que hayan
 * entrado al top. También refresca, por cada plataforma y género
 * conocido, qué títulos aparecen ahí hoy.
 */
export async function runDailySync() {
  const startedAt = Date.now();
  let moviesUpserted = 0;
  let tvUpserted = 0;

  for (let page = 1; page <= TRENDING_PAGES; page++) {
    const data = await tmdbDiscover({ mediaType: "movie", watchRegion: env.defaultCountry, page });
    for (const raw of data.results) {
      await upsertMovie(raw);
      moviesUpserted++;
    }
    await sleep(TMDB_REQUEST_DELAY_MS);
  }

  for (let page = 1; page <= TRENDING_PAGES; page++) {
    const data = await tmdbDiscover({ mediaType: "tv", watchRegion: env.defaultCountry, page });
    for (const raw of data.results) {
      await upsertTv(raw);
      tvUpserted++;
    }
    await sleep(TMDB_REQUEST_DELAY_MS);
  }

  for (const platform of PLATFORMS) {
    const platformRow = await prisma.platform.findUnique({ where: { slug: platform.slug } });
    if (!platformRow) continue;

    for (let page = 1; page <= PLATFORM_PAGES; page++) {
      const data = await tmdbDiscover({
        mediaType: "movie",
        watchRegion: env.defaultCountry,
        withWatchProviders: platform.tmdbId,
        page,
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
  }

  for (const genre of TMDB_GENRES) {
    for (let page = 1; page <= GENRE_PAGES; page++) {
      const data = await tmdbDiscover({
        mediaType: "movie",
        watchRegion: env.defaultCountry,
        withGenres: genre.tmdbId,
        page,
      });
      for (const raw of data.results) {
        await upsertMovie(raw);
      }
      await sleep(TMDB_REQUEST_DELAY_MS);
    }
  }

  return {
    job: "daily",
    durationMs: Date.now() - startedAt,
    moviesUpserted,
    tvUpserted,
  };
}
