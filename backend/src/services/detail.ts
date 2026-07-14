import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { getOrFetchMovie } from "./movies";
import { getOrFetchTv } from "./tv";
import { syncContentMedia, getCastFor, getTrailerFor, getSimilarFor } from "./media";
import { resolveProviders } from "./streamingLinks";
import { env } from "../config/env";
import { STALE_TTL_MS, isStale } from "../config/sync";

async function ensureMediaSynced(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  lastMediaSync: Date | null
) {
  if (isStale(lastMediaSync, STALE_TTL_MS.media)) {
    await syncContentMedia(contentType, contentId, tmdbId);
  }
}

/** `id` acá es SIEMPRE nuestro id interno (Movie.id), nunca el de TMDB. */
export async function getMovieDetailById(id: number, country = env.defaultCountry) {
  const row = await prisma.movie.findUnique({ where: { id } });
  if (!row) return null;
  return getMovieDetail(row.tmdbId, country);
}

async function getMovieDetail(tmdbId: number, country: string) {
  const movie = await getOrFetchMovie(tmdbId);
  if (!movie) return null;

  await ensureMediaSynced("movie", movie.id, movie.tmdbId, movie.lastMediaSync);

  const [cast, trailerKey, similar, providers] = await Promise.all([
    getCastFor("movie", movie.id),
    getTrailerFor("movie", movie.id),
    getSimilarFor("movie", movie.id),
    resolveProviders("movie", movie.id, movie.tmdbId, movie.title, country),
  ]);

  return { movie, cast, trailerKey, similar: similar.movies, providers };
}

/** `id` acá es SIEMPRE nuestro id interno (TVShow.id), nunca el de TMDB. */
export async function getTvDetailById(id: number, country = env.defaultCountry) {
  const row = await prisma.tVShow.findUnique({ where: { id } });
  if (!row) return null;
  return getTvDetail(row.tmdbId, country);
}

async function getTvDetail(tmdbId: number, country: string) {
  const tvShow = await getOrFetchTv(tmdbId);
  if (!tvShow) return null;

  await ensureMediaSynced("tv", tvShow.id, tvShow.tmdbId, tvShow.lastMediaSync);

  const [cast, trailerKey, similar, providers] = await Promise.all([
    getCastFor("tv", tvShow.id),
    getTrailerFor("tv", tvShow.id),
    getSimilarFor("tv", tvShow.id),
    resolveProviders("tv", tvShow.id, tvShow.tmdbId, tvShow.title, country),
  ]);

  return { tvShow, cast, trailerKey, similar: similar.tvShows, providers };
}
