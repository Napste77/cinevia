import { Router } from "express";
import { listPlatforms } from "../services/platforms";
import { resolveImageUrl } from "../utils/media";

export const platformsRouter = Router();

platformsRouter.get("/platforms", async (_req, res) => {
  const platforms = await listPlatforms();
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
