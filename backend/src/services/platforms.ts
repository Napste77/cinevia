import { prisma } from "../db/prisma";

export async function listPlatforms() {
  return prisma.platform.findMany({ orderBy: { name: "asc" } });
}

/** Solo las plataformas que operan en `countryCode` (según platform_availability). */
export async function listPlatformsByCountry(countryCode: string) {
  return prisma.platform.findMany({
    where: { availability: { some: { country: { code: countryCode } } } },
    orderBy: { name: "asc" },
  });
}

export async function getPlatformIdByTmdbId(tmdbId: number): Promise<number | null> {
  const platform = await prisma.platform.findUnique({ where: { tmdbId } });
  return platform?.id ?? null;
}
