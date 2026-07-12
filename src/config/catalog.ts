import { CategoryDef, GenreRow } from "../types";
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

/**
 * Todas las categorías navegables con su propia página de catálogo
 * completo (/category/:slug, botón "Ver más" en el Home). Cada slug es
 * único: los de plataforma/género reusan las mismas keys que ya arman
 * las filas del Home, así "Ver más" en una fila y su catálogo completo
 * quedan definidos en un solo lugar.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    slug: "trending-movies",
    label: "Tendencias · Películas",
    source: { type: "trending", mediaType: "movie" },
  },
  {
    slug: "trending-series",
    label: "Tendencias · Series",
    source: { type: "trending", mediaType: "tv" },
  },
  ...HOME_PLATFORM_ROWS.map(
    (p): CategoryDef => ({
      slug: p.key,
      label: p.label,
      source: { type: "platform", mediaType: "movie", providerId: p.providerId },
    })
  ),
  ...GENRE_ROWS.map(
    (g): CategoryDef => ({
      slug: g.key,
      label: g.label,
      source: { type: "genre", mediaType: "movie", genreId: g.genreId },
    })
  ),
];

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
