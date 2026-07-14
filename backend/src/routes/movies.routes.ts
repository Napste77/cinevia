import { Router } from "express";
import { listTrendingMovies } from "../services/movies";
import { getMovieDetailById } from "../services/detail";
import { serializeMovieListItem, serializeMovieDetail } from "../serializers";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";

export const moviesRouter = Router();

moviesRouter.get("/movies/trending", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const movies = await listTrendingMovies(page);
  res.json({ results: movies.map(serializeMovieListItem) });
});

moviesRouter.get("/movie/:id", async (req, res) => {
  const id = Number(req.params.id);
  const country = String(req.query.country || env.defaultCountry);
  if (!Number.isFinite(id)) throw new HttpError(400, "id inválido");

  const bundle = await getMovieDetailById(id, country);
  if (!bundle) throw new HttpError(404, "Película no encontrada");
  res.json(serializeMovieDetail(bundle));
});
