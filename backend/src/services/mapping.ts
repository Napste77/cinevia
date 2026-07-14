/** Normaliza una respuesta cruda de TMDB al shape que espera Prisma. */

export function toMovieUpsertData(raw: any, imdbId?: string | null) {
  return {
    imdbId: imdbId ?? raw.imdb_id ?? null,
    title: raw.title || raw.original_title || "Sin título",
    originalTitle: raw.original_title ?? null,
    overview: raw.overview ?? null,
    releaseDate: raw.release_date ? new Date(raw.release_date) : null,
    runtime: raw.runtime ?? null,
    rating: raw.vote_average ?? 0,
    popularity: raw.popularity ?? 0,
    poster: raw.poster_path ?? null,
    backdrop: raw.backdrop_path ?? null,
    language: raw.original_language ?? null,
    status: raw.status ?? null,
  };
}

export function toTvUpsertData(raw: any, imdbId?: string | null) {
  return {
    imdbId: imdbId ?? null,
    title: raw.name || raw.original_name || "Sin título",
    originalTitle: raw.original_name ?? null,
    overview: raw.overview ?? null,
    seasons: raw.number_of_seasons ?? null,
    episodes: raw.number_of_episodes ?? null,
    firstAirDate: raw.first_air_date ? new Date(raw.first_air_date) : null,
    lastAirDate: raw.last_air_date ? new Date(raw.last_air_date) : null,
    rating: raw.vote_average ?? 0,
    popularity: raw.popularity ?? 0,
    poster: raw.poster_path ?? null,
    backdrop: raw.backdrop_path ?? null,
    language: raw.original_language ?? null,
    status: raw.status ?? null,
  };
}

/** genre_ids (discover/search) o genres:[{id,name}] (detail) -> lista de tmdb genre ids. */
export function extractGenreIds(raw: any): number[] {
  if (Array.isArray(raw.genre_ids)) return raw.genre_ids;
  if (Array.isArray(raw.genres)) return raw.genres.map((g: any) => g.id);
  return [];
}
