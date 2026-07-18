import { Router } from "express";
import { prisma } from "../db/prisma";
import { resolveProviders } from "../services/streamingLinks";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";

export const providersRouter = Router();

/** GET /providers?type=movie|tv&id=<nuestro id>&country=AR */
providersRouter.get("/providers", async (req, res) => {
  const type = req.query.type === "tv" ? "tv" : "movie";
  const id = Number(req.query.id);
  const country = String(req.query.country || env.defaultCountry);
  if (!Number.isFinite(id)) throw new HttpError(400, "id inválido");

  const row =
    type === "tv"
      ? await prisma.tVShow.findUnique({ where: { id } })
      : await prisma.movie.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, "Contenido no encontrado");

  const providers = await resolveProviders(type, row.id, row.tmdbId, row.title, country);
  res.json({ results: providers });
});
