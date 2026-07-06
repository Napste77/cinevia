import { MediaType } from "../types";
import { getPlatformByName } from "../config/streamingPlatforms";
import { getStreamingLinkOverrides } from "../data/streamingLinkOverrides";

/**
 * Resuelve a qué URL debe llevar el botón "Disponible en X" para un
 * título puntual. Orden de prioridad:
 *   1. Override manual cargado en streamingLinkOverrides.ts (link real,
 *      específico de ese título).
 *   2. Fallback automático: búsqueda del título dentro de la plataforma
 *      (funciona para cualquier contenido sin necesitar datos extra).
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
}: {
  providerName: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
}): string {
  const platform = getPlatformByName(providerName);

  if (!platform) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${title} ${providerName}`)}`;
  }

  const overrides = getStreamingLinkOverrides();
  const overrideUrl = overrides[`${mediaType}-${tmdbId}`]?.[platform.key];
  if (overrideUrl) return overrideUrl;

  return platform.searchUrl(title);
}
