export type MediaType = "movie" | "tv";

export interface TrendingItem {
  id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface ProvidersByCountry {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  link: string;
}

export interface VideoResult {
  key: string;
  site: string;
  type: string;
  official: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface DetailData {
  id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  trailerKey: string | null;
  providers: ProvidersByCountry | null;
  genres: Genre[];
  year: string | null;
  runtimeMinutes: number | null;
  vote_average: number;
  cast: CastMember[];
  recommendations: TrendingItem[];
}

/** Filas de plataforma que arma el Home. */
export interface StreamingPlatform {
  key: string;
  label: string;
  providerId: number;
}

/** Filas de género que arma el Home (usa IDs de género de TMDB para movie). */
export interface GenreRow {
  key: string;
  label: string;
  genreId: number;
}
