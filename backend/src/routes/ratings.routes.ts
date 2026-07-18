import { Router } from "express";
import { ContentType } from "@prisma/client";
import { getRatingSummary, getUserRating, rateContent, deleteRating } from "../services/ratings";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

export const ratingsRouter = Router();

function parseTarget(req: any): { contentType: ContentType; contentId: number } {
  const contentType: ContentType = req.query.type === "tv" || req.body?.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.query.id ?? req.body?.id);
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");
  return { contentType, contentId };
}

/** Público: promedio + cantidad de votos. Si viene logueado, incluye su propia calificación. */
ratingsRouter.get("/ratings", optionalAuth, async (req, res) => {
  const { contentType, contentId } = parseTarget(req);
  const summary = await getRatingSummary(contentType, contentId);
  const myRating = req.userId ? await getUserRating(req.userId, contentType, contentId) : null;
  res.json({ ...summary, myRating });
});

ratingsRouter.post("/ratings", requireAuth, async (req, res) => {
  const { contentType, contentId } = parseTarget(req);
  const value = Number(req.body?.value);
  const summary = await rateContent(req.userId!, contentType, contentId, value);
  res.json({ ...summary, myRating: value });
});

ratingsRouter.delete("/ratings", requireAuth, async (req, res) => {
  const { contentType, contentId } = parseTarget(req);
  const summary = await deleteRating(req.userId!, contentType, contentId);
  res.json({ ...summary, myRating: null });
});
