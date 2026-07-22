import express from "express";
import cors from "cors";
import { homeRouter } from "./routes/home.routes";
import { moviesRouter } from "./routes/movies.routes";
import { seriesRouter } from "./routes/series.routes";
import { searchRouter } from "./routes/search.routes";
import { platformsRouter } from "./routes/platforms.routes";
import { genresRouter } from "./routes/genres.routes";
import { discoverRouter } from "./routes/discover.routes";
import { providersRouter } from "./routes/providers.routes";
import { internalRouter } from "./routes/internal.routes";
import { authRouter } from "./routes/auth.routes";
import { geoRouter } from "./routes/geo.routes";
import { ratingsRouter } from "./routes/ratings.routes";
import { commentsRouter } from "./routes/comments.routes";
import { favoritesRouter } from "./routes/favorites.routes";
import { viewsRouter } from "./routes/views.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { prisma } from "./db/prisma";

export function createApp() {
  const app = express();

  // Detrás de nginx/Netlify/un balanceador (Hostinger VPS con reverse
  // proxy, o cualquier PaaS), sin esto `req.ip` sería la IP del proxy, no
  // la del visitante — rompería la detección de país por IP (/geo/detect).
  app.set("trust proxy", true);

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  /**
   * A diferencia de /health (que solo confirma que el proceso Node
   * está vivo), este endpoint hace una consulta real a la base. El
   * plan free de Aiven apaga el servicio de MySQL solo por
   * inactividad -- el cron externo que ya pegaba a /health cada 2
   * minutos mantenia despierto el web service de Render, pero nunca
   * tocaba la base, asi que Aiven se apagaba igual (causa del caido
   * del 22/07/2026). El cron ahora debe apuntar aca para que la base
   * tambien se mantenga activa.
   */
  app.get("/health/db", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: true });
    } catch (e) {
      res.status(503).json({ ok: false, db: false });
    }
  });

  // API propia de NowSee: el frontend (web/Android/iOS) solo conoce estos
  // endpoints. Ninguna API externa (TMDB, Wikidata, etc.) se expone acá.
  app.use(homeRouter);
  app.use(moviesRouter);
  app.use(seriesRouter);
  app.use(searchRouter);
  app.use(platformsRouter);
  app.use(genresRouter);
  app.use(discoverRouter);
  app.use(providersRouter);
  app.use(internalRouter);
  app.use(authRouter);
  app.use(geoRouter);
  app.use(ratingsRouter);
  app.use(commentsRouter);
  app.use(favoritesRouter);
  app.use(viewsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
