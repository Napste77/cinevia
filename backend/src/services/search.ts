import { prisma } from "../db/prisma";
import { tmdbSearchMulti } from "../providers/tmdb";
import { upsertMovie } from "./movies";
import { upsertTv } from "./tv";
import { mapWithConcurrency } from "../utils/concurrency";

/**
 * Full-text search en MySQL (índice @@fulltext de title/original_title).
 * Se usa $queryRaw solo para obtener los IDs en orden de relevancia; los
 * datos completos se traen con el cliente normal de Prisma (tipado,
 * columnas en camelCase) y después se reordenan según ese ranking.
 */
async function fullTextSearchIds(table: "movies" | "tv_shows", query: string, limit: number) {
  const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `SELECT id FROM ${table} WHERE MATCH(title, original_title) AGAINST (? IN NATURAL LANGUAGE MODE) LIMIT ?`,
    query,
    limit
  );
  return rows.map((r) => r.id);
}

function sortByIdOrder<T extends { id: number }>(items: T[], order: number[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return order.map((id) => byId.get(id)).filter((i): i is T => Boolean(i));
}

export async function search(query: string, limit = 20) {
  const sanitized = query.trim();
  if (sanitized.length < 2) return { movies: [], tvShows: [] };

  const [movieIds, tvIds] = await Promise.all([
    fullTextSearchIds("movies", sanitized, limit).catch(() => []),
    fullTextSearchIds("tv_shows", sanitized, limit).catch(() => []),
  ]);

  let movies = movieIds.length
    ? sortByIdOrder(
        await prisma.movie.findMany({ where: { id: { in: movieIds } } }),
        movieIds
      )
    : [];
  let tvShows = tvIds.length
    ? sortByIdOrder(
        await prisma.tVShow.findMany({ where: { id: { in: tvIds } } }),
        tvIds
      )
    : [];

  // Descubrimiento automático: si la base todavía no tiene nada para esta
  // búsqueda, la resolvemos en vivo contra TMDB, la guardamos, y a partir
  // de ahora ese contenido ya queda indexado localmente.
  if (movies.length === 0 && tvShows.length === 0) {
    const { results } = await tmdbSearchMulti(sanitized);
    const relevant = results.slice(0, limit);
    // Concurrencia acotada (mismo motivo que en movies.ts/tv.ts discover):
    // upsertear todo el batch a la vez deadlockeaba MySQL por choques en
    // MovieGenre/TVGenre.
    const upserted = await mapWithConcurrency(
      relevant,
      4,
      async (raw): Promise<{ type: "movie" | "tv"; row: any } | null> => {
        if (raw.media_type === "movie") return { type: "movie", row: await upsertMovie(raw) };
        if (raw.media_type === "tv") return { type: "tv", row: await upsertTv(raw) };
        return null;
      }
    );
    for (const u of upserted) {
      if (!u) continue;
      if (u.type === "movie") movies.push(u.row as any);
      else tvShows.push(u.row as any);
    }
  }

  return { movies, tvShows };
}
