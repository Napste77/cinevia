import { prisma } from "../db/prisma";
import { tmdbDiscover, tmdbGetDetail } from "../providers/tmdb";
import { toTvUpsertData, extractGenreIds } from "./mapping";
import { attachTvGenres } from "./genres";
import { getPlatformIdByTmdbId } from "./platforms";
import { STALE_TTL_MS, isStale } from "../config/sync";
import { env } from "../config/env";

const PAGE_SIZE = 20;

async function upsertTv(raw: any, imdbId?: string | null) {
  const data = toTvUpsertData(raw, imdbId);
  const tvShow = await prisma.tVShow.upsert({
    where: { tmdbId: raw.id },
    update: { ...data, lastSync: new Date(), syncStatus: "synced", lastError: null },
    create: { tmdbId: raw.id, ...data, lastSync: new Date(), syncStatus: "synced" },
  });
  await attachTvGenres(tvShow.id, extractGenreIds(raw));
  return tvShow;
}

/** Ver movies.ts::getOrFetchMovie — misma idea, devuelve también el detailBundle cuando lo pidió. */
export async function getOrFetchTv(tmdbId: number) {
  const existing = await prisma.tVShow.findUnique({
    where: { tmdbId },
    include: { genres: { include: { genre: true } } },
  });

  if (existing) {
    if (!isStale(existing.lastSync, STALE_TTL_MS.content)) {
      return { tvShow: existing, detailBundle: undefined };
    }
    // Ver movies.ts::getOrFetchMovie — mismo stale-while-revalidate.
    refreshTvInBackground(tmdbId, existing.id);
    return { tvShow: existing, detailBundle: undefined };
  }

  const detailBundle = await tmdbGetDetail("tv", tmdbId);
  const tvShow = await upsertTv(detailBundle.detail, detailBundle.externalIds.imdb_id);
  const full = await prisma.tVShow.findUnique({
    where: { id: tvShow.id },
    include: { genres: { include: { genre: true } } },
  });
  return { tvShow: full, detailBundle };
}

function refreshTvInBackground(tmdbId: number, tvShowId: number) {
  (async () => {
    try {
      const detailBundle = await tmdbGetDetail("tv", tmdbId);
      await upsertTv(detailBundle.detail, detailBundle.externalIds.imdb_id);
    } catch (e: any) {
      await prisma.tVShow
        .update({
          where: { id: tvShowId },
          data: { syncStatus: "error", lastError: String(e?.message || e) },
        })
        .catch(() => {});
    }
  })();
}

export async function listTrendingTv(page = 1, pageSize = PAGE_SIZE) {
  const count = await prisma.tVShow.count();
  if (count === 0) {
    await bootstrapTrendingTv();
  }

  return prisma.tVShow.findMany({
    orderBy: { popularity: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { genres: { include: { genre: true } } },
  });
}

export async function bootstrapTrendingTv() {
  const data = await tmdbDiscover({ mediaType: "tv", watchRegion: env.defaultCountry, page: 1 });
  for (const raw of data.results) {
    await upsertTv(raw);
  }
}

export interface DiscoverTvParams {
  genreTmdbId?: number;
  platformTmdbId?: number;
  /** Rango de años de estreno (inclusive), cualquiera de los dos opcional. */
  yearFrom?: number;
  yearTo?: number;
  sortBy?: "popularity" | "newest";
  country?: string;
  page?: number;
  pageSize?: number;
}

/** Ver movies.ts::discoverMovies — misma estrategia de filtros combinables. */
export async function discoverTv(params: DiscoverTvParams) {
  const page = params.page || 1;
  const pageSize = params.pageSize || PAGE_SIZE;
  const country = params.country || env.defaultCountry;
  const orderBy =
    params.sortBy === "newest" ? { firstAirDate: "desc" as const } : { popularity: "desc" as const };

  let platformId: number | null = null;
  if (params.platformTmdbId) {
    platformId = await getPlatformIdByTmdbId(params.platformTmdbId);
    if (!platformId) return [];
  }

  const baseWhere: any = {};
  if (params.genreTmdbId) {
    baseWhere.genres = { some: { genre: { tmdbId: params.genreTmdbId } } };
  }
  if (params.yearFrom || params.yearTo) {
    baseWhere.firstAirDate = {
      ...(params.yearFrom ? { gte: new Date(Date.UTC(params.yearFrom, 0, 1)) } : {}),
      ...(params.yearTo ? { lt: new Date(Date.UTC(params.yearTo + 1, 0, 1)) } : {}),
    };
  }

  // Misma optimización que en movies.ts::discoverMovies — evitar pedir
  // la lista de IDs por plataforma dos veces (count + where final).
  let cachedPlatformIds: number[] | null = null;
  const platformContentIds = async (): Promise<number[]> => {
    if (cachedPlatformIds !== null) return cachedPlatformIds;
    const links = await prisma.streamingLink.findMany({
      where: { contentType: "tv", platformId: platformId!, country },
      select: { contentId: true },
    });
    const ids: number[] = links.map((l: { contentId: number }) => l.contentId);
    cachedPlatformIds = ids;
    return ids;
  };

  const countMatching = async () => {
    if (!platformId) return prisma.tVShow.count({ where: baseWhere });
    const ids = await platformContentIds();
    if (ids.length === 0) return 0;
    return prisma.tVShow.count({ where: { ...baseWhere, id: { in: ids } } });
  };

  const total = await countMatching();

  if (total < page * pageSize) {
    const data = await tmdbDiscover({
      mediaType: "tv",
      watchRegion: country,
      withGenres: params.genreTmdbId,
      withWatchProviders: params.platformTmdbId,
      yearFrom: params.yearFrom,
      yearTo: params.yearTo,
      page,
    });
    // Misma optimización que en movies.ts::discoverMovies — resolver los
    // upserts en paralelo en vez de uno por uno en serie.
    await Promise.all(
      data.results.map(async (raw: any) => {
        const tvShow = await upsertTv(raw);
        if (platformId) {
          await prisma.streamingLink.upsert({
            where: {
              content_platform_country: {
                contentType: "tv",
                contentId: tvShow.id,
                platformId,
                country,
              },
            },
            update: {},
            create: { contentType: "tv", contentId: tvShow.id, platformId, country, verified: false },
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

  return prisma.tVShow.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { genres: { include: { genre: true } } },
  });
}

export { upsertTv };
