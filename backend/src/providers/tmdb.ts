import axios from "axios";
import { env } from "../config/env";

/**
 * Adaptador de TMDB. Es el ÚNICO módulo de todo el sistema que sabe que
 * TMDB existe: nada fuera de src/providers/ y src/services/ debería
 * importar esto. El resto de la app (rutas, frontend) solo conoce
 * nuestras propias entidades (Movie, TVShow, etc.), nunca la forma de la
 * respuesta de TMDB.
 */

const client = axios.create({
  baseURL: env.tmdbBaseUrl,
  timeout: 10000,
  params: {
    api_key: env.tmdbApiKey,
    language: "es-ES",
  },
});

export interface TmdbDiscoverParams {
  mediaType: "movie" | "tv";
  watchRegion?: string;
  withWatchProviders?: number;
  withGenres?: number;
  page?: number;
}

export async function tmdbDiscover(params: TmdbDiscoverParams) {
  const res = await client.get(`/discover/${params.mediaType}`, {
    params: {
      watch_region: params.watchRegion,
      with_watch_providers: params.withWatchProviders,
      with_genres: params.withGenres,
      with_watch_monetization_types: params.withWatchProviders ? "flatrate" : undefined,
      sort_by: "popularity.desc",
      page: params.page || 1,
    },
  });
  return res.data as { results: any[]; total_pages: number; total_results: number };
}

export async function tmdbSearchMulti(query: string) {
  const res = await client.get("/search/multi", { params: { query } });
  return res.data as { results: any[] };
}

export async function tmdbGetDetail(mediaType: "movie" | "tv", tmdbId: number) {
  const [detail, videos, credits, recommendations, externalIds] = await Promise.all([
    client.get(`/${mediaType}/${tmdbId}`),
    client.get(`/${mediaType}/${tmdbId}/videos`),
    client.get(`/${mediaType}/${tmdbId}/credits`),
    client.get(`/${mediaType}/${tmdbId}/recommendations`),
    client.get(`/${mediaType}/${tmdbId}/external_ids`).catch(() => ({ data: {} })),
  ]);

  return {
    detail: detail.data,
    videos: videos.data.results as any[],
    credits: { cast: credits.data.cast as any[] },
    recommendations: recommendations.data.results as any[],
    externalIds: externalIds.data as { imdb_id?: string },
  };
}

export async function tmdbGetWatchProviders(
  mediaType: "movie" | "tv",
  tmdbId: number,
  country: string
) {
  const res = await client.get(`/${mediaType}/${tmdbId}/watch/providers`);
  const forCountry = res.data?.results?.[country];
  return forCountry || null;
}

export async function tmdbGetImages(mediaType: "movie" | "tv", tmdbId: number) {
  const res = await client.get(`/${mediaType}/${tmdbId}/images`);
  return res.data as { posters: any[]; backdrops: any[]; logos: any[] };
}
