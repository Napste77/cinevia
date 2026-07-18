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

/**
 * Discovery-on-demand: DB primero; si no existe o quedó vieja, se resuelve
 * contra TMDB y se guarda. Devuelve también el `detailBundle` de TMDB
 * cuando lo tuvo que pedir (video/credits/recomendaciones incluidos), así
 * quien llama (ver services/detail.ts) puede reusarlo para sincronizar
 * cast/tráiler/imágenes sin pedirle lo mismo a TMDB dos veces.
 */
export async function getOrFetchMovie(tmdbId: number) {
  const existing = await prisma.movie.findUnique({
    where: { tmdbId },
    include: { genres: { include: { genre: true } } },
  });

  if (existing && !isStale(existing.lastSync, STALE_TTL_MS.content)) {
    return { movie: existing, detailBundle: undefined };
  }

  try {
    const detailBundle = await tmdbGetDetail("movie", tmdbId);
    const movie = await upsertMovie(detailBundle.detail, detailBundle.externalIds.imdb_id);
    const full = await prisma.movie.findUnique({
      where: { id: movie.id },
      include: { genres: { include: { genre: true } } },
    });
    return { movie: full, detailBundle };
  } catch (e: any) {
    if (existing) {
      // TMDB falló pero ya teníamos algo guardado: seguimos funcionando con
      // lo último conocido en vez de romper la respuesta al usuario.
      await prisma.movie.update({
        where: { id: existing.id },
        data: { syncStatus: "error", lastError: String(e?.message || e) },
      });
      return { movie: existing, detailBundle: undefined };
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
  /** Año exacto de estreno. */
  year?: number;
  /** "popularity" (default) o "newest" (estreno más reciente primero). */
  sortBy?: "popularity" | "newest";
  country?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Discover combinable: género + plataforma + año + orden, todos a la vez
 * (no uno solo). Estrategia: arma el WHERE de Prisma con todos los
 * filtros que apliquen; si la cobertura sincronizada no alcanza para la
 * página pedida, resuelve esa combinación exacta en vivo contra TMDB (que
 * sí soporta combinar with_genres + with_watch_providers + año en una
 * sola llamada) y la persiste antes de volver a consultar la base.
 */
export async function discoverMovies(params: DiscoverMoviesParams) {
  const page = params.page || 1;
  const pageSize = params.pageSize || PAGE_SIZE;
  const country = params.country || env.defaultCountry;
  const orderBy = params.sortBy === "newest" ? { releaseDate: "desc" as const } : { popularity: "desc" as const };

  let platformId: number | null = null;
  if (params.platformTmdbId) {
    platformId = await getPlatformIdByTmdbId(params.platformTmdbId);
    if (!platformId) return [];
  }

  const baseWhere: any = {};
  if (params.genreTmdbId) {
    baseWhere.genres = { some: { genre: { tmdbId: params.genreTmdbId } } };
  }
  if (params.year) {
    baseWhere.releaseDate = {
      gte: new Date(Date.UTC(params.year, 0, 1)),
      lt: new Date(Date.UTC(params.year + 1, 0, 1)),
    };
  }

  // Se pedía esta misma lista dos veces por request (una para el count,
  // otra para el where del findMany final) — cada una es un viaje a la
  // MySQL remota de Hostinger. Se resuelve una sola vez y se cachea acá
  // (`cachedPlatformIds`) para reusarla más abajo.
  let cachedPlatformIds: number[] | null = null;
  const platformContentIds = async (): Promise<number[]> => {
    if (cachedPlatformIds !== null) return cachedPlatformIds;
    const links = await prisma.streamingLink.findMany({
      where: { contentType: "movie", platformId: platformId!, country },
      select: { contentId: true },
    });
    const ids: number[] = links.map((l: { contentId: number }) => l.contentId);
    cachedPlatformIds = ids;
    return ids;
  };

  const countMatching = async () => {
    if (!platformId) return prisma.movie.count({ where: baseWhere });
    const ids = await platformContentIds();
    if (ids.length === 0) return 0;
    return prisma.movie.count({ where: { ...baseWhere, id: { in: ids } } });
  };

  const total = await countMatching();

  if (total < page * pageSize) {
    const data = await tmdbDiscover({
      mediaType: "movie",
      watchRegion: country,
      withGenres: params.genreTmdbId,
      withWatchProviders: params.platformTmdbId,
      year: params.year,
      page,
    });
    // Antes se hacía un `await upsertMovie` por item, en serie (hasta 20
    // viajes secuenciales a la MySQL remota). Cada item es independiente,
    // así que se resuelven en paralelo — mismo patrón ya usado en
    // services/search.ts para su propio fallback de TMDB.
    await Promise.all(
      data.results.map(async (raw: any) => {
        const movie = await upsertMovie(raw);
        if (platformId) {
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
            create: { contentType: "movie", contentId: movie.id, platformId, country, verified: false },
          });
        }
      })
    );
    if (platformId) cachedPlatformIds = null; // se insertaron links nuevos, invalidar el cache local
  }

  const where = { ...baseWhere } as any;
  if (platformId) {
    const ids = await platformContentIds();
    where.id = { in: ids.length ? ids : [-1] };
  }

  return prisma.movie.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { genres: { include: { genre: true } } },
  });
}

export { upsertMovie };
