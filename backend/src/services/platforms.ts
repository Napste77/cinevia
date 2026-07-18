import { prisma } from "../db/prisma";

/**
 * El catálogo de plataformas (~15-20 filas) casi no cambia — solo lo toca
 * el sync mensual. Sin embargo `getPlatformIdByTmdbId` se llama una vez
 * por cada fila de plataforma del Home (hasta 7 veces por carga) y
 * `listPlatformsByCountry` una vez más — cada llamada es un viaje de red
 * a la MySQL de Hostinger (remota, no local a Render). Cachear esto en
 * memoria del proceso durante unos minutos elimina esas ~8 consultas
 * redundantes por carga de Home sin arriesgar datos desactualizados de
 * forma perceptible.
 */
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 min

let platformIdCache: { data: Map<number, number>; expiresAt: number } | null = null;
const platformsByCountryCache = new Map<string, { data: any[]; expiresAt: number }>();
let allPlatformsCache: { data: any[]; expiresAt: number } | null = null;

async function getPlatformIdMap(): Promise<Map<number, number>> {
  if (platformIdCache && platformIdCache.expiresAt > Date.now()) {
    return platformIdCache.data;
  }
  const rows = await prisma.platform.findMany({ select: { id: true, tmdbId: true } });
  const data = new Map<number, number>(rows.map((r: { id: number; tmdbId: number }) => [r.tmdbId, r.id]));
  platformIdCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export async function listPlatforms() {
  if (allPlatformsCache && allPlatformsCache.expiresAt > Date.now()) {
    return allPlatformsCache.data;
  }
  const data = await prisma.platform.findMany({ orderBy: { name: "asc" } });
  allPlatformsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

/** Solo las plataformas que operan en `countryCode` (según platform_availability). */
export async function listPlatformsByCountry(countryCode: string) {
  const cached = platformsByCountryCache.get(countryCode);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const data = await prisma.platform.findMany({
    where: { availability: { some: { country: { code: countryCode } } } },
    orderBy: { name: "asc" },
  });
  platformsByCountryCache.set(countryCode, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export async function getPlatformIdByTmdbId(tmdbId: number): Promise<number | null> {
  const map = await getPlatformIdMap();
  return map.get(tmdbId) ?? null;
}
