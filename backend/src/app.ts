import express from "express";
import cors from "cors";
import { moviesRouter } from "./routes/movies.routes";
import { seriesRouter } from "./routes/series.routes";
import { searchRouter } from "./routes/search.routes";
import { platformsRouter } from "./routes/platforms.routes";
import { genresRouter } from "./routes/genres.routes";
import { discoverRouter } from "./routes/discover.routes";
import { providersRouter } from "./routes/providers.routes";
import { internalRouter } from "./routes/internal.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // API propia de NowSee: el frontend (web/Android/iOS) solo conoce estos
  // endpoints. Ninguna API externa (TMDB, Wikidata, etc.) se expone acá.
  app.use(moviesRouter);
  app.use(seriesRouter);
  app.use(searchRouter);
  app.use(platformsRouter);
  app.use(genresRouter);
  app.use(discoverRouter);
  app.use(providersRouter);
  app.use(internalRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
