import { MediaType } from "../types";
import { getWikidataStreamingLinks } from "./wikidataStreamingIds";
import { getStreamingAvailabilityLinks } from "./streamingAvailability";

/**
 * Combina las dos fuentes de deep links "en vivo" (automáticas, sin
 * intervención manual) en un solo mapa `platformKey -> URL exacta`:
 *
 *   1. Wikidata (src/api/wikidataStreamingIds.ts): gratis, sin límite,
 *      cubre Netflix / Disney+ / Apple TV cuando el título está
 *      documentado ahí.
 *   2. Streaming Availability API (src/api/streamingAvailability.ts):
 *      opcional (requiere API key), cubre además Prime Video, Max,
 *      Paramount+, Hulu y Crunchyroll.
 *
 * Wikidata tiene prioridad donde ambas coincidan (dato abierto,
 * verificado por la comunidad); la API paga solo rellena lo que
 * Wikidata no cubre. Así la app funciona con cobertura real y sin
 * costo, y la API opcional es una mejora incremental, no una
 * dependencia obligatoria.
 */
export async function getResolvedLiveLinks(
  tmdbId: number,
  mediaType: MediaType,
  country: string
): Promise<Record<string, string>> {
  const [wikidataLinks, availabilityLinks] = await Promise.all([
    getWikidataStreamingLinks(tmdbId, mediaType),
    getStreamingAvailabilityLinks(tmdbId, mediaType, country),
  ]);

  return { ...availabilityLinks, ...wikidataLinks };
}
