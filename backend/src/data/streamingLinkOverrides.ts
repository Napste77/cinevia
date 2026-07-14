/**
 * Overrides manuales de enlaces de streaming por título (portado desde el
 * frontend). Clave: `${contentType}-${tmdbId}` (ej. "tv-66732"). Valor: un
 * mapa `platformSlug -> URL completa`. Ver StreamingLink en el schema de
 * Prisma para la versión "viva" (resuelta automáticamente y cacheada en
 * la base) — esto es solo el último fallback manual antes de caer a la
 * búsqueda genérica dentro de la plataforma.
 */
export type StreamingLinkOverrides = Record<string, Record<string, string>>;

const OVERRIDES: StreamingLinkOverrides = {
  // "movie-603": { netflix: "https://www.netflix.com/title/XXXXXXXX" },
};

export function getStreamingLinkOverrides(): StreamingLinkOverrides {
  return OVERRIDES;
}
