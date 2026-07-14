import axios from "axios";
import { TrendingItem, DetailData, MediaType, CategorySource } from "../types";

/**
 * Único cliente HTTP del frontend: habla exclusivamente con la API propia
 * de NowSee (src/backend), nunca con TMDB ni ninguna otra API externa.
 * Toda esa lógica (fetch, normalización, caché, deep links) vive del lado
 * del servidor — ver backend/README.md.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";

const client = axios.create({ baseURL: BASE_URL });

export async function getTrendingByCountry(
  country: string,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  const path = mediaType === "movie" ? "/movies/trending" : "/series/trending";
  const res = await client.get(path, { params: { country } });
  return res.data.results;
}

export async function getByPlatform(
  country: string,
  providerId: number,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  const res = await client.get("/discover", {
    params: { type: mediaType, provider: providerId, country, page: 1 },
  });
  return res.data.results;
}

export async function getByGenre(
  country: string,
  genreId: number,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  const res = await client.get("/discover", {
    params: { type: mediaType, genre: genreId, country, page: 1 },
  });
  return res.data.results;
}

/** Catálogo completo paginado de una categoría (CategoryScreen: scroll infinito). */
export async function getCategoryPage(
  country: string,
  source: CategorySource,
  page = 1
): Promise<{ items: TrendingItem[]; totalPages: number }> {
  const res = await client.get("/discover", {
    params: {
      type: source.mediaType,
      genre: source.type === "genre" ? source.genreId : undefined,
      provider: source.type === "platform" ? source.providerId : undefined,
      country,
      page,
    },
  });
  // El backend crece la cobertura bajo demanda: mientras devuelva resultados,
  // seguimos pidiendo más páginas (no expone total_pages todavía).
  const items: TrendingItem[] = res.data.results;
  return { items, totalPages: items.length > 0 ? page + 1 : page };
}

export async function searchTitles(query: string): Promise<TrendingItem[]> {
  const res = await client.get("/search", { params: { q: query } });
  return res.data.results;
}

export async function getDetail(
  id: number,
  mediaType: MediaType,
  country: string
): Promise<DetailData> {
  const path = mediaType === "movie" ? `/movie/${id}` : `/tv/${id}`;
  const res = await client.get(path, { params: { country } });
  return res.data;
}
