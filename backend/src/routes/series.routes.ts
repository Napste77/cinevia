import { Router } from "express";
import { listTrendingTv } from "../services/tv";
import { getTvDetailById } from "../services/detail";
import { serializeTvListItem, serializeTvDetail } from "../serializers";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";

export const seriesRouter = Router();

seriesRouter.get("/series/trending", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const tvShows = await listTrendingTv(page);
  res.json({ results: tvShows.map(serializeTvListItem) });
});

seriesRouter.get("/tv/:id", async (req, res) => {
  const id = Number(req.params.id);
  const country = String(req.query.country || env.defaultCountry);
  if (!Number.isFinite(id)) throw new HttpError(400, "id inválido");

  const bundle = await getTvDetailById(id, country);
  if (!bundle) throw new HttpError(404, "Serie no encontrada");
  res.json(serializeTvDetail(bundle));
});
