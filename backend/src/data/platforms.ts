/**
 * Definición de plataformas de streaming soportadas. Portado desde el
 * frontend (antes vivía en src/config/streamingPlatforms.ts): ahora es el
 * backend el único que conoce cómo construir un deep link por plataforma,
 * el frontend solo consume el resultado ya resuelto vía GET /providers.
 */
export interface PlatformDef {
  tmdbId: number;
  slug: string;
  name: string;
  color: string;
  webBaseUrl: string;
  titleUrl?: (nativeId: string) => string;
  searchUrl: (title: string) => string;
}

const enc = (s: string) => encodeURIComponent(s);

export const PLATFORMS: PlatformDef[] = [
  {
    tmdbId: 8,
    slug: "netflix",
    name: "Netflix",
    color: "#E50914",
    webBaseUrl: "https://www.netflix.com",
    titleUrl: (id) => `https://www.netflix.com/title/${id}`,
    searchUrl: (title) => `https://www.netflix.com/search?q=${enc(title)}`,
  },
  {
    tmdbId: 337,
    slug: "disney",
    name: "Disney+",
    color: "#113CCF",
    webBaseUrl: "https://www.disneyplus.com",
    searchUrl: (title) => `https://www.disneyplus.com/search?q=${enc(title)}`,
  },
  {
    tmdbId: 119,
    slug: "prime",
    name: "Prime Video",
    color: "#00A8E1",
    webBaseUrl: "https://www.primevideo.com",
    titleUrl: (id) => `https://www.primevideo.com/detail/${id}`,
    // primevideo.com no soporta búsqueda por URL sin sesión (redirige al
    // inicio); el buscador general de Amazon filtrado a video sí funciona
    // sin login y lleva a resultados reales.
    searchUrl: (title) => `https://www.amazon.com/s?k=${enc(title)}&i=instant-video`,
  },
  {
    tmdbId: 1899,
    slug: "max",
    name: "Max",
    color: "#7B61FF",
    webBaseUrl: "https://play.max.com",
    titleUrl: (id) => `https://play.max.com/video/watch/${id}`,
    searchUrl: (title) => `https://play.max.com/search?q=${enc(title)}`,
  },
  {
    tmdbId: 350,
    slug: "apple",
    name: "Apple TV+",
    color: "#000000",
    webBaseUrl: "https://tv.apple.com",
    titleUrl: (id) => `https://tv.apple.com/movie/${id}`,
    searchUrl: (title) => `https://tv.apple.com/search?term=${enc(title)}`,
  },
  {
    tmdbId: 531,
    slug: "paramount",
    name: "Paramount+",
    color: "#0064FF",
    webBaseUrl: "https://www.paramountplus.com",
    titleUrl: (id) => `https://www.paramountplus.com/movies/video/${id}`,
    searchUrl: (title) => `https://www.paramountplus.com/search/?query=${enc(title)}`,
  },
  {
    tmdbId: 15,
    slug: "hulu",
    name: "Hulu",
    color: "#1CE783",
    webBaseUrl: "https://www.hulu.com",
    titleUrl: (id) => `https://www.hulu.com/watch/${id}`,
    searchUrl: (title) => `https://www.hulu.com/search?q=${enc(title)}`,
  },
  {
    tmdbId: 283,
    slug: "crunchyroll",
    name: "Crunchyroll",
    color: "#F47521",
    webBaseUrl: "https://www.crunchyroll.com",
    titleUrl: (id) => `https://www.crunchyroll.com/series/${id}`,
    searchUrl: (title) => `https://www.crunchyroll.com/search?q=${enc(title)}`,
  },
];

export function getPlatformBySlug(slug: string): PlatformDef | undefined {
  return PLATFORMS.find((p) => p.slug === slug);
}

export function getPlatformByTmdbId(tmdbId: number): PlatformDef | undefined {
  return PLATFORMS.find((p) => p.tmdbId === tmdbId);
}

export function getPlatformByName(providerName: string): PlatformDef | undefined {
  return PLATFORMS.find((p) =>
    providerName.toLowerCase().includes(p.name.toLowerCase().replace("+", ""))
  );
}
