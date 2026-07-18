import { Router } from "express";
import { search } from "../services/search";
import { serializeMovieListItem, serializeTvListItem } from "../serializers";

export const searchRouter = Router();

searchRouter.get("/search", async (req, res) => {
  const query = String(req.query.q || "");
  const { movies, tvShows } = await search(query);
  res.json({
    results: [...movies.map(serializeMovieListItem), ...tvShows.map(serializeTvListItem)],
  });
});
