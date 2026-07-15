import { Router } from "express";
import { ContentType } from "@prisma/client";
import * as comments from "../services/comments";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

export const commentsRouter = Router();

/** Lectura pública — cualquiera puede leer comentarios y ver la puntuación general. */
commentsRouter.get("/comments", async (req, res) => {
  const contentType: ContentType = req.query.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.query.id);
  const page = Number(req.query.page) || 1;
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");

  const result = await comments.listComments(contentType, contentId, page);
  res.json(result);
});

commentsRouter.post("/comments", requireAuth, async (req, res) => {
  const contentType: ContentType = req.body?.type === "tv" ? "tv" : "movie";
  const contentId = Number(req.body?.id);
  if (!Number.isFinite(contentId)) throw new HttpError(400, "id inválido");

  const comment = await comments.createComment(req.userId!, contentType, contentId, req.body?.body);
  res.status(201).json(comment);
});

commentsRouter.put("/comments/:id", requireAuth, async (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isFinite(commentId)) throw new HttpError(400, "id inválido");

  const comment = await comments.updateComment(req.userId!, commentId, req.body?.body);
  res.json(comment);
});

commentsRouter.delete("/comments/:id", requireAuth, async (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isFinite(commentId)) throw new HttpError(400, "id inválido");

  await comments.deleteComment(req.userId!, commentId);
  res.status(204).end();
});
