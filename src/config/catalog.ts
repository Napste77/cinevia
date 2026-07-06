import { GenreRow } from "../types";
import { STREAMING_PLATFORMS } from "./streamingPlatforms";

/**
 * Filas de plataforma que arma el Home. Reusa la misma capa de
 * abstracción de src/config/streamingPlatforms.ts (fuente única de
 * verdad) — acá solo elegimos cuáles mostrar como fila y en qué orden.
 * Hulu no se incluye porque no opera en la región por defecto (AR),
 * pero sigue disponible para deep links si aparece en los providers
 * de un título puntual.
 */
export const HOME_PLATFORM_ROWS = STREAMING_PLATFORMS.filter((p) => p.key !== "hulu").map(
  (p) => ({ key: p.key, label: p.label, providerId: p.providerId })
);

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
