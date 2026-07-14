import { prisma } from "../db/prisma";
import { withRetry } from "../utils/withRetry";

export async function listGenres() {
  return prisma.genre.findMany({ orderBy: { name: "asc" } });
}

async function genreIdsToInternalIds(tmdbGenreIds: number[]): Promise<number[]> {
  if (tmdbGenreIds.length === 0) return [];
  const genres = await prisma.genre.findMany({
    where: { tmdbId: { in: tmdbGenreIds } },
    select: { id: true },
  });
  return genres.map((g) => g.id);
}

export async function attachMovieGenres(movieId: number, tmdbGenreIds: number[]) {
  const genreIds = await genreIdsToInternalIds(tmdbGenreIds);
  await withRetry(() =>
    prisma.$transaction([
      prisma.movieGenre.deleteMany({ where: { movieId } }),
      ...(genreIds.length
        ? [
            prisma.movieGenre.createMany({
              data: genreIds.map((genreId) => ({ movieId, genreId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ])
  );
}

export async function attachTvGenres(tvShowId: number, tmdbGenreIds: number[]) {
  const genreIds = await genreIdsToInternalIds(tmdbGenreIds);
  await withRetry(() =>
    prisma.$transaction([
      prisma.tVGenre.deleteMany({ where: { tvShowId } }),
      ...(genreIds.length
        ? [
            prisma.tVGenre.createMany({
              data: genreIds.map((genreId) => ({ tvShowId, genreId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ])
  );
}
