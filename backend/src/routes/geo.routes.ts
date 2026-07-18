import { Router } from "express";
import { detectRegionForIp, listCountries } from "../services/region";

export const geoRouter = Router();

/**
 * Detecta el país aproximado del visitante por IP (nunca pide permiso de
 * geolocalización GPS). Pensado para llamarse una sola vez, en la primera
 * visita, antes de que el frontend tenga una región guardada.
 */
geoRouter.get("/geo/detect", async (req, res) => {
  const ip = req.header("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "";
  const country = await detectRegionForIp(ip);
  res.json({ country });
});

geoRouter.get("/countries", (_req, res) => {
  res.json({ results: listCountries() });
});
