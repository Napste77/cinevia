import { client } from "./client";
import { TrendingItem, DetailData, MediaType, CategorySource, Platform } from "../types";

/**
 * Cliente de contenido de la API propia de NowSee (src/backend) — nunca
 * TMDB ni ninguna otra API externa. Comparte instancia de axios con
 * src/api/auth.ts (ver client.ts): así el token de sesión viaja
 * automáticamente en cada request si el usuario está logueado (algunos
 * endpoints, como /movie/:id, devuelven más datos con sesión — ej. la
 * calificación propia del usuario).
 */

export interface DiscoverFilters {
  mediaType: MediaType;
  genreId?: number;
  providerId?: number;
  year?: number;
  sort?: "popularity" | "newest";
  country: string;
  page?: number;
}

/** Filtro combinable (género + plataforma + año + orden, todos a la vez). */
export async function discover(filters: DiscoverFilters): Promise<TrendingItem[]> {
  const res = await client.get("/discover", {
    params: {
      type: filters.mediaType,
      genre: filters.genreId,
      provider: filters.providerId,
      year: filters.year,
      sort: filters.sort,
      country: filters.country,
      page: filters.page || 1,
    },
  });
  return res.data.results;
}

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
  return discover({ mediaType, providerId, country, page: 1 });
}

export async function getByGenre(
  country: string,
  genreId: number,
  mediaType: MediaType = "movie"
): Promise<TrendingItem[]> {
  return discover({ mediaType, genreId, country, page: 1 });
}

/** Catálogo completo paginado de una categoría (CategoryScreen: scroll infinito + filtros). */
export async function getCategoryPage(
  country: string,
  source: CategorySource,
  page = 1,
  extraFilters?: { providerId?: number; year?: number; sort?: "popularity" | "newest" }
): Promise<{ items: TrendingItem[]; totalPages: number }> {
  const items = await discover({
    mediaType: source.mediaType,
    genreId: source.type === "genre" ? source.genreId : undefined,
    providerId: source.type === "platform" ? source.providerId : extraFilters?.providerId,
    year: extraFilters?.year,
    sort: extraFilters?.sort,
    country,
    page,
  });
  // El backend crece la cobertura bajo demanda: mientras devuelva resultados,
  // seguimos pidiendo más páginas (no expone total_pages todavía).
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

/** Plataformas disponibles en una región (para el filtro global y las filas del Home). */
export async function getPlatforms(country?: string): Promise<Platform[]> {
  const res = await client.get("/platforms", { params: country ? { country } : undefined });
  return res.data.results;
}
