import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { getOrFetchMovie } from "./movies";
import { getOrFetchTv } from "./tv";
import { syncContentMedia, getCastFor, getTrailerFor, getSimilarFor } from "./media";
import { tmdbGetDetail } from "../providers/tmdb";
import { resolveProviders } from "./streamingLinks";
import { getRatingSummary, getUserRating } from "./ratings";
import { env } from "../config/env";
import { STALE_TTL_MS, isStale } from "../config/sync";

async function ensureMediaSynced(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  lastMediaSync: Date | null,
  detailBundle?: Awaited<ReturnType<typeof tmdbGetDetail>>
) {
  if (isStale(lastMediaSync, STALE_TTL_MS.media)) {
    await syncContentMedia(contentType, contentId, tmdbId, detailBundle);
  }
}

/** Marca "visto" solo si hay un usuario logueado — alimenta las estadísticas del perfil. */
async function registerView(userId: number | null, contentType: ContentType, contentId: number) {
  if (!userId) return;
  await prisma.userView.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: { viewedAt: new Date() },
    create: { userId, contentType, contentId },
  });
}

/** `id` acá es SIEMPRE nuestro id interno (Movie.id), nunca el de TMDB. */
export async function getMovieDetailById(id: number, country = env.defaultCountry, userId: number | null = null) {
  const row = await prisma.movie.findUnique({ where: { id } });
  if (!row) return null;
  return getMovieDetail(row.tmdbId, country, userId);
}

async function getMovieDetail(tmdbId: number, country: string, userId: number | null) {
  const { movie, detailBundle } = await getOrFetchMovie(tmdbId);
  if (!movie) return null;

  await ensureMediaSynced("movie", movie.id, movie.tmdbId, movie.lastMediaSync, detailBundle);
  await registerView(userId, "movie", movie.id);

  const [cast, trailerKey, similar, providers, ratingSummary, myRating] = await Promise.all([
    getCastFor("movie", movie.id),
    getTrailerFor("movie", movie.id),
    getSimilarFor("movie", movie.id),
    resolveProviders("movie", movie.id, movie.tmdbId, movie.title, country),
    getRatingSummary("movie", movie.id),
    userId ? getUserRating(userId, "movie", movie.id) : Promise.resolve(null),
  ]);

  return { movie, cast, trailerKey, similar: similar.movies, providers, ratingSummary, myRating };
}

/** `id` acá es SIEMPRE nuestro id interno (TVShow.id), nunca el de TMDB. */
export async function getTvDetailById(id: number, country = env.defaultCountry, userId: number | null = null) {
  const row = await prisma.tVShow.findUnique({ where: { id } });
  if (!row) return null;
  return getTvDetail(row.tmdbId, country, userId);
}

async function getTvDetail(tmdbId: number, country: string, userId: number | null) {
  const { tvShow, detailBundle } = await getOrFetchTv(tmdbId);
  if (!tvShow) return null;

  await ensureMediaSynced("tv", tvShow.id, tvShow.tmdbId, tvShow.lastMediaSync, detailBundle);
  await registerView(userId, "tv", tvShow.id);

  const [cast, trailerKey, similar, providers, ratingSummary, myRating] = await Promise.all([
    getCastFor("tv", tvShow.id),
    getTrailerFor("tv", tvShow.id),
    getSimilarFor("tv", tvShow.id),
    resolveProviders("tv", tvShow.id, tvShow.tmdbId, tvShow.title, country),
    getRatingSummary("tv", tvShow.id),
    userId ? getUserRating(userId, "tv", tvShow.id) : Promise.resolve(null),
  ]);

  return { tvShow, cast, trailerKey, similar: similar.tvShows, providers, ratingSummary, myRating };
}
