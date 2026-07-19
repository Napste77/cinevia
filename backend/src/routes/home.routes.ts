import { Router } from "express";
import { getHomeRowsBundle } from "../services/home";
import { serializeMovieListItem } from "../serializers";
import { resolveImageUrl } from "../utils/media";
import { env } from "../config/env";

export const homeRouter = Router();

function parseIdList(raw: unknown): number[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

/**
 * GET /home/rows?country=AR&providers=8,337,119,...&genres=28,878,...
 * Arma en una sola respuesta las filas "secundarias" del Home: plataformas
 * disponibles en el país + una fila de descubrimiento por cada
 * provider/género pedido (mismos filtros que ya soporta /discover, solo
 * que en batch). Tendencias de películas/series NO viven acá a propósito
 * (ver /movies/trending, /series/trending): el Home las pide aparte para
 * pintar el Hero cuanto antes. El frontend sigue siendo dueño de qué
 * filas mostrar y en qué orden (src/config/catalog.ts) — acá solo se
 * resuelven los datos.
 */
homeRouter.get("/home/rows", async (req, res) => {
  const country = String(req.query.country || env.defaultCountry);
  const providerIds = parseIdList(req.query.providers);
  const genreIds = parseIdList(req.query.genres);

  const bundle = await getHomeRowsBundle(country, providerIds, genreIds);

  res.json({
    platforms: bundle.platforms.map((p: any) => ({
      id: p.tmdbId,
      slug: p.slug,
      name: p.name,
      logo: resolveImageUrl(p.logo, "tmdb", "w200"),
      color: p.color,
      website: p.website,
    })),
    platformRows: Object.fromEntries(
      Object.entries(bundle.platformRows).map(([id, items]) => [id, (items as any[]).map(serializeMovieListItem)])
    ),
    genreRows: Object.fromEntries(
      Object.entries(bundle.genreRows).map(([id, items]) => [id, (items as any[]).map(serializeMovieListItem)])
    ),
  });
});
