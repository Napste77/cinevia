import { prisma } from "../db/prisma";
import { tmdbDiscover, tmdbGetDetail } from "../providers/tmdb";
import { toMovieUpsertData, extractGenreIds } from "./mapping";
import { attachMovieGenres } from "./genres";
import { getPlatformIdByTmdbId } from "./platforms";
import { STALE_TTL_MS, isStale } from "../config/sync";
import { env } from "../config/env";

const PAGE_SIZE = 20;

async function upsertMovie(raw: any, imdbId?: string | null) {
  const data = toMovieUpsertData(raw, imdbId);
  const movie = await prisma.movie.upsert({
    where: { tmdbId: raw.id },
    update: { ...data, lastSync: new Date(), syncStatus: "synced", lastError: null },
    create: { tmdbId: raw.id, ...data, lastSync: new Date(), syncStatus: "synced" },
  });
  await attachMovieGenres(movie.id, extractGenreIds(raw));
  return movie;
}

/** Discovery-on-demand: DB primero; si no existe o quedó vieja, se resuelve contra TMDB y se guarda. */
export async function getOrFetchMovie(tmdbId: number) {
  const existing = await prisma.movie.findUnique({
    where: { tmdbId },
    include: { genres: { include: { genre: true } } },
  });

  if (existing && !isStale(existing.lastSync, STALE_TTL_MS.content)) {
    return existing;
  }

  try {
    const { detail, externalIds } = await tmdbGetDetail("movie", tmdbId);
    const movie = await upsertMovie(detail, externalIds.imdb_id);
    return prisma.movie.findUnique({
      where: { id: movie.id },
      include: { genres: { include: { genre: true } } },
    });
  } catch (e: any) {
    if (existing) {
      // TMDB falló pero ya teníamos algo guardado: seguimos funcionando con
      // lo último conocido en vez de romper la respuesta al usuario.
      await prisma.movie.update({
        where: { id: existing.id },
        data: { syncStatus: "error", lastError: String(e?.message || e) },
      });
      return existing;
    }
    throw e;
  }
}

export async function listTrendingMovies(page = 1, pageSize = PAGE_SIZE) {
  const count = await prisma.movie.count();
  if (count === 0) {
    // Bootstrap: la primera vez que se levanta el sistema todavía no corrió
    // ningún job de sync. En vez de devolver una lista vacía, resolvemos
    // en vivo una sola vez para no arrancar con la app "rota".
    await bootstrapTrendingMovies();
  }

  return prisma.movie.findMany({
    orderBy: { popularity: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { genres: { include: { genre: true } } },
  });
}

export async function bootstrapTrendingMovies() {
  const data = await tmdbDiscover({ mediaType: "movie", watchRegion: env.defaultCountry, page: 1 });
  for (const raw of data.results) {
    await upsertMovie(raw);
  }
}

export interface DiscoverMoviesParams {
  genreTmdbId?: number;
  platformTmdbId?: number;
  country?: string;
  page?: number;
  pageSize?: number;
}

export async function discoverMovies(params: DiscoverMoviesParams) {
  const page = params.page || 1;
  const pageSize = params.pageSize || PAGE_SIZE;
  const country = params.country || env.defaultCountry;

  if (params.platformTmdbId) {
    return discoverMoviesByPlatform(params.platformTmdbId, country, page, pageSize);
  }
  if (params.genreTmdbId) {
    return discoverMoviesByGenre(params.genreTmdbId, page, pageSize);
  }
  return listTrendingMovies(page, pageSize);
}

async function discoverMoviesByGenre(genreTmdbId: number, page: number, pageSize: number) {
  const where = { genres: { some: { genre: { tmdbId: genreTmdbId } } } };
  const total = await prisma.movie.count({ where });

  if (total < page * pageSize) {
    // Todavía no sincronizamos suficiente cobertura para esta página:
    // la resolvemos en vivo contra TMDB y la persistimos (crece la base).
    const data = await tmdbDiscover({
      mediaType: "movie",
      watchRegion: env.defaultCountry,
      withGenres: genreTmdbId,
      page,
    });
    for (const raw of data.results) {
      await upsertMovie(raw);
    }
  }

  return prisma.movie.findMany({
    where,
    orderBy: { popularity: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { genres: { include: { genre: true } } },
  });
}

async function discoverMoviesByPlatform(
  platformTmdbId: number,
  country: string,
  page: number,
  pageSize: number
) {
  const platformId = await getPlatformIdByTmdbId(platformTmdbId);
  if (!platformId) return [];

  const linkWhere = { contentType: "movie" as const, platformId, country };
  const total = await prisma.streamingLink.count({ where: linkWhere });

  if (total < page * pageSize) {
    const data = await tmdbDiscover({
      mediaType: "movie",
      watchRegion: country,
      withWatchProviders: platformTmdbId,
      page,
    });
    for (const raw of data.results) {
      const movie = await upsertMovie(raw);
      await prisma.streamingLink.upsert({
        where: {
          content_platform_country: {
            contentType: "movie",
            contentId: movie.id,
            platformId,
            country,
          },
        },
        update: {},
        create: {
          contentType: "movie",
          contentId: movie.id,
          platformId,
          country,
          verified: false,
        },
      });
    }
  }

  const links = await prisma.streamingLink.findMany({
    where: linkWhere,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const movieIds = links.map((l) => l.contentId);
  if (movieIds.length === 0) return [];

  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
    orderBy: { popularity: "desc" },
    include: { genres: { include: { genre: true } } },
  });
  return movies;
}

export { upsertMovie };
