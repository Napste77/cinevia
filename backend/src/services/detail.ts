import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { getOrFetchMovie } from "./movies";
import { getOrFetchTv } from "./tv";
import { syncContentMedia, getCastFor, getTrailerFor, getSimilarFor } from "./media";
import { tmdbGetDetail } from "../providers/tmdb";
import { resolveProviders } from "./streamingLinks";
import { getRatingSummary, getUserRating } from "./ratings";
import { env } from "../config/env";
import { STALE_TTL_MS, isStale } from "../config/sync";

/**
 * Marca una promesa como "manejada" sin tragarse el error: las queries del
 * detalle se disparan ANTES del primer await (para acortar la cadena
 * crítica), y si una rechazara en ese intervalo sin handler, Node >=15
 * mata el proceso por unhandledRejection. El error real igual llega al
 * Promise.all de más abajo.
 */
function fireEarly<T>(p: Promise<T>): Promise<T> {
  p.catch(() => {});
  return p;
}

/**
 * La sync de media (cast/tráiler/recomendaciones) escribe decenas de filas
 * en la MySQL remota — medido en producción: ~5 segundos bloqueando la
 * ficha cuando le tocaba refrescar. Solo vale la pena esperarla la PRIMERA
 * vez en la vida del título (sin ella la ficha saldría vacía); si ya hay
 * media de una sync anterior, se responde al instante con eso y el
 * refresh corre en background — misma estrategia stale-while-revalidate
 * que ya usa resolveProviders (ver streamingLinks.ts).
 */
async function ensureMediaSynced(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  lastMediaSync: Date | null,
  detailBundle?: Awaited<ReturnType<typeof tmdbGetDetail>>
) {
  if (lastMediaSync === null) {
    await syncContentMedia(contentType, contentId, tmdbId, detailBundle);
    return;
  }
  if (isStale(lastMediaSync, STALE_TTL_MS.media)) {
    syncContentMedia(contentType, contentId, tmdbId, detailBundle).catch((e) =>
      console.error(`Error refrescando media de ${contentType} ${contentId} en background:`, e)
    );
  }
}

/** Marca "visto" solo si hay un usuario logueado — alimenta las estadísticas del perfil. */
async function registerView(userId: number | null, contentType: ContentType, contentId: number) {
  if (!userId) return;
  await prisma.userView.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: { viewedAt: new Date() },
    create: { userId, contentType, contentId },
  });
}

/** `id` acá es SIEMPRE nuestro id interno (Movie.id), nunca el de TMDB. */
export async function getMovieDetailById(id: number, country = env.defaultCountry, userId: number | null = null) {
  // Una sola query (con géneros incluidos): si el título está fresco, es
  // directamente la fila que se responde — antes se buscaba acá por id y
  // getOrFetchMovie volvía a buscar por tmdbId (~300ms extra por el viaje
  // a la MySQL remota).
  const row = await prisma.movie.findUnique({
    where: { id },
    include: { genres: { include: { genre: true } } },
  });
  if (!row) return null;
  return getMovieDetail(row, country, userId);
}

async function getMovieDetail(
  preloaded: NonNullable<Awaited<ReturnType<typeof prisma.movie.findUnique>>> & { genres: any },
  country: string,
  userId: number | null
) {
  // Cast/tráiler/similares/ratings solo necesitan nuestro id interno, que
  // ya lo tenemos — se disparan de una. Solo providers depende de datos
  // del título (tmdbId/title), que ya vienen en `preloaded`. Cada viaje a
  // la MySQL remota cuesta ~250-300ms, así que acortar la cadena crítica
  // en un solo salto se nota.
  const castP = fireEarly(getCastFor("movie", preloaded.id));
  const trailerP = fireEarly(getTrailerFor("movie", preloaded.id));
  const similarP = fireEarly(getSimilarFor("movie", preloaded.id));
  const ratingP = fireEarly(getRatingSummary("movie", preloaded.id));
  const myRatingP = fireEarly(userId ? getUserRating(userId, "movie", preloaded.id) : Promise.resolve(null));
  const providersP = fireEarly(resolveProviders("movie", preloaded.id, preloaded.tmdbId, preloaded.title, country));

  let movie: any = preloaded;
  let detailBundle: Awaited<ReturnType<typeof tmdbGetDetail>> | undefined;
  if (isStale(preloaded.lastSync, STALE_TTL_MS.content)) {
    const fetched = await getOrFetchMovie(preloaded.tmdbId);
    if (!fetched.movie) return null;
    movie = fetched.movie;
    detailBundle = fetched.detailBundle;
  }

  await ensureMediaSynced("movie", movie.id, movie.tmdbId, movie.lastMediaSync, detailBundle);
  // Estadística de perfil, no hace falta esperarla para responder la ficha.
  registerView(userId, "movie", movie.id).catch((e) =>
    console.error("Error registrando vista:", e)
  );

  const [cast, trailerKey, similar, providers, ratingSummary, myRating] = await Promise.all([
    castP,
    trailerP,
    similarP,
    providersP,
    ratingP,
    myRatingP,
  ]);

  return { movie, cast, trailerKey, similar: similar.movies, providers, ratingSummary, myRating };
}

/** `id` acá es SIEMPRE nuestro id interno (TVShow.id), nunca el de TMDB. */
export async function getTvDetailById(id: number, country = env.defaultCountry, userId: number | null = null) {
  // Ver getMovieDetailById — misma optimización de query única.
  const row = await prisma.tVShow.findUnique({
    where: { id },
    include: { genres: { include: { genre: true } } },
  });
  if (!row) return null;
  return getTvDetail(row, country, userId);
}

async function getTvDetail(
  preloaded: NonNullable<Awaited<ReturnType<typeof prisma.tVShow.findUnique>>> & { genres: any },
  country: string,
  userId: number | null
) {
  // Ver getMovieDetail — mismas queries disparadas de entrada.
  const castP = fireEarly(getCastFor("tv", preloaded.id));
  const trailerP = fireEarly(getTrailerFor("tv", preloaded.id));
  const similarP = fireEarly(getSimilarFor("tv", preloaded.id));
  const ratingP = fireEarly(getRatingSummary("tv", preloaded.id));
  const myRatingP = fireEarly(userId ? getUserRating(userId, "tv", preloaded.id) : Promise.resolve(null));
  const providersP = fireEarly(resolveProviders("tv", preloaded.id, preloaded.tmdbId, preloaded.title, country));

  let tvShow: any = preloaded;
  let detailBundle: Awaited<ReturnType<typeof tmdbGetDetail>> | undefined;
  if (isStale(preloaded.lastSync, STALE_TTL_MS.content)) {
    const fetched = await getOrFetchTv(preloaded.tmdbId);
    if (!fetched.tvShow) return null;
    tvShow = fetched.tvShow;
    detailBundle = fetched.detailBundle;
  }

  await ensureMediaSynced("tv", tvShow.id, tvShow.tmdbId, tvShow.lastMediaSync, detailBundle);
  // Estadística de perfil, no hace falta esperarla para responder la ficha.
  registerView(userId, "tv", tvShow.id).catch((e) =>
    console.error("Error registrando vista:", e)
  );

  const [cast, trailerKey, similar, providers, ratingSummary, myRating] = await Promise.all([
    castP,
    trailerP,
    similarP,
    providersP,
    ratingP,
    myRatingP,
  ]);

  return { tvShow, cast, trailerKey, similar: similar.tvShows, providers, ratingSummary, myRating };
}
