/**
 * Capa de abstracción de plataformas de streaming.
 *
 * Esto es lo único que el resto de la app conoce sobre cada plataforma:
 * ni las pantallas ni los componentes de UI saben nada de URLs, deep
 * links o estrategias de apertura — todo eso vive acá y en
 * `src/api/streamingLinks.ts`.
 *
 * `titleUrl` es la plantilla de "Universal Link / App Link" oficial de la
 * plataforma: una URL https normal que, al navegarla desde un dispositivo
 * con la app instalada, el sistema operativo intercepta y abre la app en
 * la ficha del título (el mismo mecanismo que usan los links que cada
 * plataforma genera al tocar "Compartir"). Si la app no está instalada,
 * la misma URL simplemente carga la página web — por eso no hace falta
 * ninguna lógica de "detectar si está instalada y hacer fallback": el
 * fallback es automático y lo maneja el propio sistema operativo.
 *
 * `searchUrl` es el fallback genérico que funciona para cualquier título
 * sin necesitar un ID nativo de la plataforma (útil hasta que exista un
 * override manual para ese contenido puntual, ver streamingLinkOverrides.ts).
 */

export interface StreamingPlatformDef {
  key: string;
  label: string;
  color: string;
  /** ID de provider de TMDB (para /discover con with_watch_providers). */
  providerId: number;
  webBaseUrl: string;
  /** Construye la universal-link a partir de un ID nativo de la plataforma. */
  titleUrl?: (nativeId: string) => string;
  /** Fallback: búsqueda del título dentro de la plataforma (funciona siempre). */
  searchUrl: (title: string) => string;
}

const enc = (s: string) => encodeURIComponent(s);

export const STREAMING_PLATFORMS: StreamingPlatformDef[] = [
  {
    key: "netflix",
    label: "Netflix",
    color: "#E50914",
    providerId: 8,
    webBaseUrl: "https://www.netflix.com",
    titleUrl: (id) => `https://www.netflix.com/title/${id}`,
    searchUrl: (title) => `https://www.netflix.com/search?q=${enc(title)}`,
  },
  {
    key: "disney",
    label: "Disney+",
    color: "#113CCF",
    providerId: 337,
    webBaseUrl: "https://www.disneyplus.com",
    // Disney+ requiere slug + id compuesto (no un template simple) -> siempre vía override.
    searchUrl: (title) => `https://www.disneyplus.com/search?q=${enc(title)}`,
  },
  {
    key: "prime",
    label: "Prime Video",
    color: "#00A8E1",
    providerId: 119,
    webBaseUrl: "https://www.primevideo.com",
    titleUrl: (id) => `https://www.primevideo.com/detail/${id}`,
    searchUrl: (title) =>
      `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${enc(title)}`,
  },
  {
    key: "max",
    label: "Max",
    color: "#7B61FF",
    providerId: 1899,
    webBaseUrl: "https://play.max.com",
    titleUrl: (id) => `https://play.max.com/video/watch/${id}`,
    searchUrl: (title) => `https://play.max.com/search?q=${enc(title)}`,
  },
  {
    key: "apple",
    label: "Apple TV+",
    color: "#000000",
    providerId: 350,
    webBaseUrl: "https://tv.apple.com",
    titleUrl: (id) => `https://tv.apple.com/movie/${id}`,
    searchUrl: (title) => `https://tv.apple.com/search?term=${enc(title)}`,
  },
  {
    key: "paramount",
    label: "Paramount+",
    color: "#0064FF",
    providerId: 531,
    webBaseUrl: "https://www.paramountplus.com",
    titleUrl: (id) => `https://www.paramountplus.com/movies/video/${id}`,
    searchUrl: (title) => `https://www.paramountplus.com/search/?query=${enc(title)}`,
  },
  {
    key: "hulu",
    label: "Hulu",
    color: "#1CE783",
    providerId: 15,
    webBaseUrl: "https://www.hulu.com",
    titleUrl: (id) => `https://www.hulu.com/watch/${id}`,
    searchUrl: (title) => `https://www.hulu.com/search?q=${enc(title)}`,
  },
  {
    key: "crunchyroll",
    label: "Crunchyroll",
    color: "#F47521",
    providerId: 283,
    webBaseUrl: "https://www.crunchyroll.com",
    titleUrl: (id) => `https://www.crunchyroll.com/series/${id}`,
    searchUrl: (title) => `https://www.crunchyroll.com/search?q=${enc(title)}`,
  },
];

export function getPlatformByProviderId(providerId: number): StreamingPlatformDef | undefined {
  return STREAMING_PLATFORMS.find((p) => p.providerId === providerId);
}

export function getPlatformByName(providerName: string): StreamingPlatformDef | undefined {
  return STREAMING_PLATFORMS.find((p) =>
    providerName.toLowerCase().includes(p.label.toLowerCase().replace("+", ""))
  );
}
