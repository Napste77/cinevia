import { Router } from "express";
import { listPlatforms, listPlatformsByCountry } from "../services/platforms";
import { resolveImageUrl } from "../utils/media";

export const platformsRouter = Router();

/** GET /platforms  o  GET /platforms?country=AR (solo las que operan ahí). */
platformsRouter.get("/platforms", async (req, res) => {
  const country = req.query.country ? String(req.query.country) : null;
  const platforms = country ? await listPlatformsByCountry(country) : await listPlatforms();

  res.json({
    results: platforms.map((p) => ({
      id: p.tmdbId,
      slug: p.slug,
      name: p.name,
      logo: resolveImageUrl(p.logo, "tmdb", "w200"),
      color: p.color,
      website: p.website,
    })),
  });
});
