import { prisma } from "../db/prisma";

export async function listPlatforms() {
  return prisma.platform.findMany({ orderBy: { name: "asc" } });
}

export async function getPlatformIdByTmdbId(tmdbId: number): Promise<number | null> {
  const platform = await prisma.platform.findUnique({ where: { tmdbId } });
  return platform?.id ?? null;
}
