import { prisma } from "../db/prisma";
import { getOrSetCache } from "../utils/cache";

/**
 * El catálogo de plataformas (~15-20 filas) casi no cambia — solo lo toca
 * el sync mensual. Sin embargo `getPlatformIdByTmdbId` se llama una vez
 * por cada fila de plataforma del Home (hasta 7 veces por carga) y
 * `listPlatformsByCountry` una vez más — cada llamada es un viaje de red
 * a la base. Cachear esto (Redis compartido entre invocaciones, ver
 * utils/cache.ts) elimina esas ~8 consultas redundantes por carga de
 * Home sin arriesgar datos desactualizados de forma perceptible.
 */
const CACHE_TTL_SECONDS = 60 * 10; // 10 min

async function getPlatformIdMap(): Promise<Map<number, number>> {
  const entries = await getOrSetCache("platforms:id-map", CACHE_TTL_SECONDS, async () => {
    const rows = await prisma.platform.findMany({ select: { id: true, tmdbId: true } });
    // tmdbId es nullable en el schema: las plataformas sin id de TMDB no
    // pueden entrar al mapa (y tampoco tendría sentido buscarlas por él).
    return rows
      .filter((r: { id: number; tmdbId: number | null }) => r.tmdbId !== null)
      .map((r: { id: number; tmdbId: number | null }) => [r.tmdbId as number, r.id] as [number, number]);
  });
  return new Map(entries);
}

export async function listPlatforms() {
  return getOrSetCache("platforms:all", CACHE_TTL_SECONDS, () =>
    prisma.platform.findMany({ orderBy: { name: "asc" } })
  );
}

/** Solo las plataformas que operan en `countryCode` (según platform_availability). */
export async function listPlatformsByCountry(countryCode: string) {
  return getOrSetCache(`platforms:by-country:${countryCode}`, CACHE_TTL_SECONDS, () =>
    prisma.platform.findMany({
      where: { availability: { some: { country: { code: countryCode } } } },
      orderBy: { name: "asc" },
    })
  );
}

export async function getPlatformIdByTmdbId(tmdbId: number): Promise<number | null> {
  const map = await getPlatformIdMap();
  return map.get(tmdbId) ?? null;
}
