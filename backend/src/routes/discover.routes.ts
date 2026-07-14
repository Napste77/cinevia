import { Router } from "express";
import { discoverMovies } from "../services/movies";
import { discoverTv } from "../services/tv";
import { serializeMovieListItem, serializeTvListItem } from "../serializers";
import { env } from "../config/env";

export const discoverRouter = Router();

/**
 * GET /discover?type=movie|tv&genre=<tmdbGenreId>&provider=<tmdbProviderId>&country=AR&page=1
 * Sin `genre` ni `provider`, se comporta como el listado general (tendencias).
 */
discoverRouter.get("/discover", async (req, res) => {
  const type = req.query.type === "tv" ? "tv" : "movie";
  const genreTmdbId = req.query.genre ? Number(req.query.genre) : undefined;
  const platformTmdbId = req.query.provider ? Number(req.query.provider) : undefined;
  const country = String(req.query.country || env.defaultCountry);
  const page = Number(req.query.page) || 1;

  if (type === "tv") {
    const results = await discoverTv({ genreTmdbId, platformTmdbId, country, page });
    res.json({ results: results.map(serializeTvListItem), page });
    return;
  }

  const results = await discoverMovies({ genreTmdbId, platformTmdbId, country, page });
  res.json({ results: results.map(serializeMovieListItem), page });
});
