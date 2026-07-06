import { MediaType } from "../types";
import { getPlatformByName } from "../config/streamingPlatforms";
import { getStreamingLinkOverrides } from "../data/streamingLinkOverrides";

/**
 * Resuelve a qué URL debe llevar el botón "Disponible en X" para un
 * título puntual. Orden de prioridad:
 *   1. Link real de la Streaming Availability API (ver
 *      src/api/streamingAvailability.ts) — el link exacto a la ficha del
 *      título en esa plataforma, resuelto automáticamente por TMDB id.
 *   2. Override manual cargado en streamingLinkOverrides.ts, por si un
 *      título puntual necesita un link cargado a mano (la API no cubre
 *      todo, o hace falta corregir un caso puntual).
 *   3. Último recurso: búsqueda del título dentro de la plataforma. Solo
 *      se usa si ninguna de las dos fuentes anteriores tiene datos para
 *      ese título/plataforma/región.
 *
 * El resultado siempre es una URL https normal (universal link o de
 * búsqueda) — abrirla con Linking.openURL (nativo) o como <a href> (web)
 * alcanza para que el sistema operativo decida si abre la app instalada
 * o cae al navegador. No hace falta lógica de detección de instalación.
 */
export function resolveStreamingLink({
  providerName,
  mediaType,
  tmdbId,
  title,
  liveLinks,
}: {
  providerName: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  /** Mapa platformKey -> link exacto, ya resuelto por getStreamingAvailabilityLinks. */
  liveLinks?: Record<string, string>;
}): string {
  const platform = getPlatformByName(providerName);

  if (!platform) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${title} ${providerName}`)}`;
  }

  const liveUrl = liveLinks?.[platform.key];
  if (liveUrl) return liveUrl;

  const overrides = getStreamingLinkOverrides();
  const overrideUrl = overrides[`${mediaType}-${tmdbId}`]?.[platform.key];
  if (overrideUrl) return overrideUrl;

  return platform.searchUrl(title);
}
