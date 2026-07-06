/**
 * Overrides manuales de enlaces de streaming por título.
 *
 * Por qué existe este archivo: no hay ninguna API pública (ni la de TMDB
 * ni ninguna alternativa gratuita confiable) que devuelva el ID interno
 * que cada plataforma usa en sus URLs de ficha (ej. el "81580367" de
 * netflix.com/title/81580367). TMDB solo expone `external_ids` como
 * imdb_id, no IDs de Netflix/Disney+/etc. Por eso, para los títulos que
 * SÍ quieras que abran directo en la app en vez de cae en la búsqueda,
 * hay que cargar acá el link real (el mismo que copiás con "Compartir"
 * desde la propia plataforma, sin los parámetros de tracking que son
 * efímeros).
 *
 * Este archivo es la única pieza que hay que tocar para asociar un
 * título con su link real — ningún componente ni pantalla necesita
 * cambios. Si en el futuro esto se muda a una fuente remota (una hoja de
 * cálculo publicada como JSON, un mini-backend, un CMS headless), alcanza
 * con reemplazar la función `getStreamingLinkOverrides` de más abajo por
 * un fetch: el resolver en `src/api/streamingLinks.ts` no cambia.
 *
 * Formato de la clave: `${mediaType}-${tmdbId}` (ej. "tv-66732").
 * Formato del valor: un mapa `platformKey -> URL completa` (la key de
 * plataforma es la de `src/config/streamingPlatforms.ts`, ej. "netflix").
 *
 * Ejemplo (comentado a propósito: reemplazá por links reales verificados
 * antes de cargar overrides en producción):
 *
 * "tv-66732": {
 *   netflix: "https://www.netflix.com/title/80057281",
 * },
 */
export type StreamingLinkOverrides = Record<string, Record<string, string>>;

const OVERRIDES: StreamingLinkOverrides = {
  // "movie-603": { netflix: "https://www.netflix.com/title/XXXXXXXX" },
};

export function getStreamingLinkOverrides(): StreamingLinkOverrides {
  return OVERRIDES;
}
