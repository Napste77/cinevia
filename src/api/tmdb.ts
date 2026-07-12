import axios from "axios";
import Constants from "expo-constants";
import {
  TrendingItem,
  DetailData,
  ProvidersByCountry,
  MediaType,
  CastMember,
  CategorySource,
} from "../types";

const API_KEY =
  process.env.EXPO_PUBLIC_TMDB_API_KEY ||
  (Constants.expoConfig?.extra?.tmdbApiKey as string) ||
  "TU_TMDB_API_KEY_ACA";

const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

const client = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: "es-ES",
  },
});

export function posterUrl(
  path: string | null,
  size: "w200" | "w342" | "w500" = "w342"
) {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function backdropUrl(
  path: string | null,
  size: "w780" | "w1280" = "w1280"
) {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function profileUrl(path: string | null) {
  if (!path) return null;
  return `${IMG_BASE}/w185${path}`;
}

function mapItem(item: any, mediaType: MediaType): TrendingItem {
  return {
    id: item.id,
    media_type: mediaType,
    title: item.title || item.name,
    overview: item.overview,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average,
    release_date: item.release_date || item.first_air_date,
  };
}

/**
 * Fetch paginado genérico contra /discover, usado tanto por las filas del
 * Home (siempre page 1) como por la página de catálogo completo de una
 * categoría (/category/:slug, con scroll infinito).
 */
export async function getCategoryPage(
  countryCode: string,
  source: CategorySource,
  page = 1
): Promise<{ items: TrendingItem[]; totalPages: number }> {
  const params: Record<string, string | number> = {
    watch_region: countryCode,
    with_watch_monetization_types: "flatrate",
    sort_by: "popularity.desc",
    page,
  };
  if (source.type === "platform" && source.providerId) {
    params.with_watch_providers = source.providerId;
  }
  if (source.type === "genre" && source.genreId) {
    params.with_genres = source.genreId;
  }

  const res = await client.get(`/discover/${source.mediaType}`, { params });

  return {
    items: res.data.results.map((item: any) => mapItem(item, source.mediaType)),
    totalPages: res.data.total_pages || 1,
  };
}

/**
 * Trending por región. TMDB no filtra /trending por país directamente,
 * así que usamos /discover con watch_region para acercarnos a
 * "lo que es tendencia y se puede ver en ese país".
 */
export async function getTrendingByCountry(
  countryCode: string,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  const { items } = await getCategoryPage(countryCode, { type: "trending", mediaType }, 1);
  return items;
}

/** Catálogo de una plataforma de streaming puntual (Netflix, Disney+, etc). */
export async function getByPlatform(
  countryCode: string,
  providerId: number,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  const { items } = await getCategoryPage(
    countryCode,
    { type: "platform", mediaType, providerId },
    1
  );
  return items;
}

/** Catálogo por género, disponible por suscripción en el país dado. */
export async function getByGenre(
  countryCode: string,
  genreId: number,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  const { items } = await getCategoryPage(countryCode, { type: "genre", mediaType, genreId }, 1);
  return items;
}

export async function searchTitles(query: string): Promise<TrendingItem[]> {
  const res = await client.get("/search/multi", {
    params: { query },
  });

  return res.data.results
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .map((item: any) => mapItem(item, item.media_type));
}

export async function getDetail(
  id: number,
  mediaType: MediaType,
  countryCode: string
): Promise<DetailData> {
  const [detailRes, videosRes, providersRes, creditsRes, recsRes] =
    await Promise.all([
      client.get(`/${mediaType}/${id}`),
      client.get(`/${mediaType}/${id}/videos`),
      client.get(`/${mediaType}/${id}/watch/providers`),
      client.get(`/${mediaType}/${id}/credits`),
      client.get(`/${mediaType}/${id}/recommendations`),
    ]);

  const trailer = videosRes.data.results.find(
    (v: any) => v.site === "YouTube" && v.type === "Trailer"
  );

  const providersForCountry = providersRes.data.results?.[countryCode];

  const providers: ProvidersByCountry | null = providersForCountry
    ? {
        flatrate: providersForCountry.flatrate,
        rent: providersForCountry.rent,
        buy: providersForCountry.buy,
        link: providersForCountry.link,
      }
    : null;

  const cast: CastMember[] = (creditsRes.data.cast || [])
    .slice(0, 12)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
    }));

  const recommendations: TrendingItem[] = (recsRes.data.results || [])
    .slice(0, 12)
    .map((item: any) => mapItem(item, mediaType));

  const releaseDate = detailRes.data.release_date || detailRes.data.first_air_date;
  const runtimeMinutes =
    detailRes.data.runtime ??
    (Array.isArray(detailRes.data.episode_run_time)
      ? detailRes.data.episode_run_time[0]
      : null) ??
    null;

  return {
    id,
    media_type: mediaType,
    title: detailRes.data.title || detailRes.data.name,
    overview: detailRes.data.overview,
    poster_path: detailRes.data.poster_path,
    backdrop_path: detailRes.data.backdrop_path,
    trailerKey: trailer ? trailer.key : null,
    providers,
    genres: detailRes.data.genres || [],
    year: releaseDate ? String(releaseDate).slice(0, 4) : null,
    runtimeMinutes: runtimeMinutes || null,
    vote_average: detailRes.data.vote_average || 0,
    cast,
    recommendations,
  };
}
