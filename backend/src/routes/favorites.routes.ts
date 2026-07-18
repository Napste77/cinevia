import { Router } from "express";
import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import * as favorites from "../services/favorites";
import { serializeMovieListItem, serializeTvListItem } from "../serializers";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

export const favoritesRouter = Router();

async function hydrateFavorites(rows: { contentType: ContentType; contentId: number }[]) {
  const movieIds = rows.filter((r) => r.contentType === "movie").map((r) => r.contentId);
  const tvIds = rows.filter((r) => r.contentType === "tv").map((r) => r.contentId);

  const [movies, tvShows] = await Promise.all([
    movieIds.length ? prisma.movie.findMany({ where: { id: { in: movieIds } } }) : [],
    tvIds.length ? prisma.tVShow.findMany({ where: { id: { in: tvIds } } }) : [],
  ]);

  return [...movies.map(serializeMovieListItem), ...tvShows.map(serializeTvListItem)];
}

/** "Mi Lista" sincronizada — requiere cuenta (los anónimos usan la lista local del dispositivo). */
favoritesRouter.get("/favorites", requireAuth, async (req, res) => {
  const rows = await favorites.listFavorites(req.userId!);
  res.json({ results: await hydrateFavorites(rows) });
});

favoritesRouter.post("/favorites", requireAuth, async (req, res) => {
  const contentType: ContentType = req.body?.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.body?.id);
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");

  await favorites.addFavorite(req.userId!, contentType, contentId);
  res.status(204).end();
});

favoritesRouter.delete("/favorites/:type/:id", requireAuth, async (req, res) => {
  const contentType: ContentType = req.params.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.params.id);
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");

  await favorites.removeFavorite(req.userId!, contentType, contentId);
  res.status(204).end();
});

/**
 * Se llama una vez al loguearse, con la lista local (anónima) del
 * dispositivo — sube lo que no estuviera ya en la cuenta y devuelve la
 * lista fusionada, ya lista para reemplazar el estado local.
 */
favoritesRouter.post("/favorites/sync", requireAuth, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const parsed = items
    .map((it: any) => ({
      contentType: (it.media_type === "tv" ? "tv" : "movie") as ContentType,
      contentId: Number(it.id),
    }))
    .filter((it: any) => Number.isFinite(it.contentId));

  const rows = await favorites.mergeFavorites(req.userId!, parsed);
  res.json({ results: await hydrateFavorites(rows) });
});
