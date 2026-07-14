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

export async function getOrFetchTv(tmdbId: number) {
  const existing = await prisma.tVShow.findUnique({
    where: { tmdbId },
    include: { genres: { include: { genre: true } } },
  });

  if (existing && !isStale(existing.lastSync, STALE_TTL_MS.content)) {
    return existing;
  }

  try {
    const { detail, externalIds } = await tmdbGetDetail("tv", tmdbId);
    const tvShow = await upsertTv(detail, externalIds.imdb_id);
    return prisma.tVShow.findUnique({
      where: { id: tvShow.id },
      include: { genres: { include: { genre: true } } },
    });
  } catch (e: any) {
    if (existing) {
      await prisma.tVShow.update({
        where: { id: existing.id },
        data: { syncStatus: "error", lastError: String(e?.message || e) },
      });
      return existing;
    }
    throw e;
  }
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
  country?: string;
  page?: number;
  pageSize?: number;
}

export async function discoverTv(params: DiscoverTvParams) {
  const page = params.page || 1;
  const pageSize = params.pageSize || PAGE_SIZE;
  const country = params.country || env.defaultCountry;

  if (params.platformTmdbId) {
    return discoverTvByPlatform(params.platformTmdbId, country, page, pageSize);
  }
  if (params.genreTmdbId) {
    return discoverTvByGenre(params.genreTmdbId, page, pageSize);
  }
  return listTrendingTv(page, pageSize);
}

async function discoverTvByGenre(genreTmdbId: number, page: number, pageSize: number) {
  const where = { genres: { some: { genre: { tmdbId: genreTmdbId } } } };
  const total = await prisma.tVShow.count({ where });

  if (total < page * pageSize) {
    const data = await tmdbDiscover({
      mediaType: "tv",
      watchRegion: env.defaultCountry,
      withGenres: genreTmdbId,
      page,
    });
    for (const raw of data.results) {
      await upsertTv(raw);
    }
  }

  return prisma.tVShow.findMany({
    where,
    orderBy: { popularity: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { genres: { include: { genre: true } } },
  });
}

async function discoverTvByPlatform(
  platformTmdbId: number,
  country: string,
  page: number,
  pageSize: number
) {
  const platformId = await getPlatformIdByTmdbId(platformTmdbId);
  if (!platformId) return [];

  const linkWhere = { contentType: "tv" as const, platformId, country };
  const total = await prisma.streamingLink.count({ where: linkWhere });

  if (total < page * pageSize) {
    const data = await tmdbDiscover({
      mediaType: "tv",
      watchRegion: country,
      withWatchProviders: platformTmdbId,
      page,
    });
    for (const raw of data.results) {
      const tvShow = await upsertTv(raw);
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
        create: {
          contentType: "tv",
          contentId: tvShow.id,
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
  const tvIds = links.map((l) => l.contentId);
  if (tvIds.length === 0) return [];

  return prisma.tVShow.findMany({
    where: { id: { in: tvIds } },
    orderBy: { popularity: "desc" },
    include: { genres: { include: { genre: true } } },
  });
}

export { upsertTv };
