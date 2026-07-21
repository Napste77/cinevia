import { Router } from "express";
import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import * as views from "../services/views";
import { serializeMovieListItem, serializeTvListItem } from "../serializers";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

export const viewsRouter = Router();

async function hydrateViews(rows: { contentType: ContentType; contentId: number }[]) {
  const movieIds = rows.filter((r) => r.contentType === "movie").map((r) => r.contentId);
  const tvIds = rows.filter((r) => r.contentType === "tv").map((r) => r.contentId);

  const [movies, tvShows] = await Promise.all([
    movieIds.length ? prisma.movie.findMany({ where: { id: { in: movieIds } } }) : [],
    tvIds.length ? prisma.tVShow.findMany({ where: { id: { in: tvIds } } }) : [],
  ]);

  return [...movies.map(serializeMovieListItem), ...tvShows.map(serializeTvListItem)];
}

/** "Ya lo vi": marca manual por usuario, independiente de la marca automática que deja abrir la ficha. */
viewsRouter.get("/views", requireAuth, async (req, res) => {
  const rows = await views.listViews(req.userId!);
  res.json({ results: await hydrateViews(rows) });
});

viewsRouter.post("/views", requireAuth, async (req, res) => {
  const contentType: ContentType = req.body?.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.body?.id);
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");

  await views.markViewed(req.userId!, contentType, contentId);
  res.status(204).end();
});

viewsRouter.delete("/views/:type/:id", requireAuth, async (req, res) => {
  const contentType: ContentType = req.params.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.params.id);
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");

  await views.unmarkViewed(req.userId!, contentType, contentId);
  res.status(204).end();
});

/** Sube la lista local (anónima) de "vistos" al loguearse — mismo patrón que /favorites/sync. */
viewsRouter.post("/views/sync", requireAuth, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const parsed = items
    .map((it: any) => ({
      contentType: (it.media_type === "tv" ? "tv" : "movie") as ContentType,
      contentId: Number(it.id),
    }))
    .filter((it: any) => Number.isFinite(it.contentId));

  const rows = await views.mergeViews(req.userId!, parsed);
  res.json({ results: await hydrateViews(rows) });
});
