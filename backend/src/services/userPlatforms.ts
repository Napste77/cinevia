import { prisma } from "../db/prisma";

/**
 * Plataformas que el usuario declara tener (elegidas en el Perfil). Se
 * guardan por relación a Platform, pero de cara al frontend se exponen por
 * `tmdbId` — que es lo que el Home usa como providerId para filtrar sus
 * filas de plataforma.
 */
export async function getUserPlatformTmdbIds(userId: number): Promise<number[]> {
  const rows = await prisma.userPlatform.findMany({
    where: { userId },
    select: { platform: { select: { tmdbId: true } } },
  });
  return rows
    .map((r) => r.platform.tmdbId)
    .filter((id): id is number => id !== null);
}

/**
 * Reemplaza por completo la selección de plataformas del usuario por la
 * lista de tmdbIds dada (borra las que ya no están, agrega las nuevas).
 * Ignora tmdbIds que no correspondan a una plataforma conocida.
 */
export async function setUserPlatforms(userId: number, platformTmdbIds: number[]): Promise<number[]> {
  const unique = [...new Set(platformTmdbIds.filter((n) => Number.isFinite(n)))];

  const platforms = unique.length
    ? await prisma.platform.findMany({
        where: { tmdbId: { in: unique } },
        select: { id: true },
      })
    : [];
  const internalIds = platforms.map((p) => p.id);

  await prisma.$transaction([
    prisma.userPlatform.deleteMany({ where: { userId } }),
    ...(internalIds.length
      ? [
          prisma.userPlatform.createMany({
            data: internalIds.map((platformId) => ({ userId, platformId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  return getUserPlatformTmdbIds(userId);
}
