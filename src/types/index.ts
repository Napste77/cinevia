export type MediaType = "movie" | "tv";

export interface TrendingItem {
  id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  /** Ya viene como URL lista para usar (la API de NowSee resuelve la fuente de la imagen). */
  poster_path: string | null;
  backdrop_path: string | null;
  /** Versión más liviana de backdrop_path, pensada solo para el Hero en mobile. */
  backdrop_path_mobile?: string | null;
  vote_average: number;
  release_date?: string;
}

/** Plataforma de streaming donde está disponible un título, con el deep link ya resuelto por el backend. */
export interface ResolvedProvider {
  providerName: string;
  logo: string | null;
  color: string | null;
  url: string;
  verified: boolean;
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
  providers: ResolvedProvider[];
  genres: Genre[];
  year: string | null;
  runtimeMinutes: number | null;
  vote_average: number;
  cast: CastMember[];
  recommendations: TrendingItem[];
}

/** Filas de género que arma el Home (usa IDs de género de TMDB para movie). */
export interface GenreRow {
  key: string;
  label: string;
  genreId: number;
}

/** De dónde sale el catálogo de una categoría (fuente para /discover). */
export interface CategorySource {
  type: "trending" | "platform" | "genre";
  mediaType: MediaType;
  providerId?: number;
  genreId?: number;
}

/** Categoría navegable con su propia página de catálogo completo (/category/:slug). */
export interface CategoryDef {
  slug: string;
  label: string;
  source: CategorySource;
}
