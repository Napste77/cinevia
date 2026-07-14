import { Router } from "express";
import { listGenres } from "../services/genres";

export const genresRouter = Router();

genresRouter.get("/genres", async (_req, res) => {
  const genres = await listGenres();
  res.json({ results: genres.map((g) => ({ id: g.tmdbId, name: g.name })) });
});
