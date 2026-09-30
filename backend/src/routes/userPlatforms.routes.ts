import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPlatformTmdbIds, setUserPlatforms } from "../services/userPlatforms";

export const userPlatformsRouter = Router();

/** GET /me/platforms -> { platforms: number[] } (tmdbIds elegidos por el usuario). */
userPlatformsRouter.get("/me/platforms", requireAuth, async (req, res) => {
  const platforms = await getUserPlatformTmdbIds(req.userId!);
  res.json({ platforms });
});

/**
 * PUT /me/platforms  body: { platforms: number[] }  (tmdbIds)
 * Reemplaza por completo la selección. Lista vacía = "no filtrar" (el Home
 * vuelve a mostrar todas las plataformas de la región).
 */
userPlatformsRouter.put("/me/platforms", requireAuth, async (req, res) => {
  const raw = Array.isArray(req.body?.platforms) ? req.body.platforms : [];
  const ids = raw.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
  const platforms = await setUserPlatforms(req.userId!, ids);
  res.json({ platforms });
});
