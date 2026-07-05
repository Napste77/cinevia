import { GenreRow, StreamingPlatform } from "../types";

/**
 * IDs de provider de TMDB verificados contra /watch/providers/movie
 * (varían por región; estos corresponden a AR y suelen repetirse en
 * la mayoría de Latam).
 */
export const STREAMING_PLATFORMS: StreamingPlatform[] = [
  { key: "netflix", label: "Netflix", providerId: 8 },
  { key: "disney", label: "Disney+", providerId: 337 },
  { key: "prime", label: "Prime Video", providerId: 119 },
  { key: "max", label: "Max", providerId: 1899 },
  { key: "apple", label: "Apple TV+", providerId: 350 },
  { key: "paramount", label: "Paramount+", providerId: 531 },
  { key: "crunchyroll", label: "Crunchyroll", providerId: 283 },
];

/** IDs de género de TMDB (movie). */
export const GENRE_ROWS: GenreRow[] = [
  { key: "action", label: "Acción", genreId: 28 },
  { key: "scifi", label: "Ciencia ficción", genreId: 878 },
  { key: "comedy", label: "Comedia", genreId: 35 },
  { key: "horror", label: "Terror", genreId: 27 },
  { key: "drama", label: "Drama", genreId: 18 },
  { key: "animation", label: "Animación", genreId: 16 },
  { key: "documentary", label: "Documentales", genreId: 99 },
];

export const DEFAULT_COUNTRY = "AR";
