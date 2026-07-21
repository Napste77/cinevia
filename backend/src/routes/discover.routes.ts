import { Router } from "express";
import { discoverMovies } from "../services/movies";
import { discoverTv } from "../services/tv";
import { serializeMovieListItem, serializeTvListItem } from "../serializers";
import { env } from "../config/env";

export const discoverRouter = Router();

/**
 * GET /discover?type=movie|tv&genre=<tmdbGenreId>&provider=<tmdbProviderId>
 *              &yearFrom=2015&yearTo=2024&sort=popularity|newest&country=AR&page=1
 * Todos los filtros son combinables entre sí (ver services/movies.ts y
 * services/tv.ts). Sin `genre` ni `provider`, se comporta como el listado
 * general ordenado por popularidad (tendencias). `yearFrom`/`yearTo` son
 * el rango del slider de año del frontend (cualquiera de los dos es
 * opcional — rango abierto); se acepta también `year` suelto por
 * compatibilidad con integraciones viejas (equivale a yearFrom=yearTo=year).
 */
discoverRouter.get("/discover", async (req, res) => {
  const type = req.query.type === "tv" ? "tv" : "movie";
  const genreTmdbId = req.query.genre ? Number(req.query.genre) : undefined;
  const platformTmdbId = req.query.provider ? Number(req.query.provider) : undefined;
  const singleYear = req.query.year ? Number(req.query.year) : undefined;
  const yearFrom = req.query.yearFrom ? Number(req.query.yearFrom) : singleYear;
  const yearTo = req.query.yearTo ? Number(req.query.yearTo) : singleYear;
  const sortBy = req.query.sort === "newest" ? "newest" : "popularity";
  const country = String(req.query.country || env.defaultCountry);
  const page = Number(req.query.page) || 1;

  if (type === "tv") {
    const results = await discoverTv({ genreTmdbId, platformTmdbId, yearFrom, yearTo, sortBy, country, page });
    res.json({ results: results.map(serializeTvListItem), page });
    return;
  }

  const results = await discoverMovies({ genreTmdbId, platformTmdbId, yearFrom, yearTo, sortBy, country, page });
  res.json({ results: results.map(serializeMovieListItem), page });
});
