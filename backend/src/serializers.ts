import { resolveImageUrl } from "./utils/media";

/**
 * Convierte los modelos de Prisma a la forma que consume el frontend.
 * Deliberadamente compatible con los tipos `TrendingItem`/`DetailData` que
 * ya existían del lado del cliente (ver src/types/index.ts del frontend)
 * para que la migración sea "cambiar de dónde vienen los datos", no
 * "reescribir cada pantalla". Es también el único lugar que convierte una
 * referencia de imagen (path + source) en una URL final: el frontend
 * nunca sabe que esa URL viene de TMDB.
 */
export function serializeMovieListItem(movie: any) {
  return {
    id: movie.id,
    media_type: "movie" as const,
    title: movie.title,
    overview: movie.overview || "",
    poster_path: resolveImageUrl(movie.poster, movie.posterSource, "w342"),
    backdrop_path: resolveImageUrl(movie.backdrop, movie.backdropSource, "w1280"),
    // Versión más liviana, solo para el Hero en mobile (LCP).
    backdrop_path_mobile: resolveImageUrl(movie.backdrop, movie.backdropSource, "w780"),
    vote_average: movie.rating,
    release_date: movie.releaseDate ? toDateString(movie.releaseDate) : undefined,
  };
}

export function serializeTvListItem(tvShow: any) {
  return {
    id: tvShow.id,
    media_type: "tv" as const,
    title: tvShow.title,
    overview: tvShow.overview || "",
    poster_path: resolveImageUrl(tvShow.poster, tvShow.posterSource, "w342"),
    backdrop_path: resolveImageUrl(tvShow.backdrop, tvShow.backdropSource, "w1280"),
    backdrop_path_mobile: resolveImageUrl(tvShow.backdrop, tvShow.backdropSource, "w780"),
    vote_average: tvShow.rating,
    release_date: tvShow.firstAirDate ? toDateString(tvShow.firstAirDate) : undefined,
  };
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function serializeCast(cast: any[]) {
  return cast.map((c) => ({ ...c, profile_path: resolveImageUrl(c.profile_path, "tmdb", "w200") }));
}

export function serializeMovieDetail(bundle: {
  movie: any;
  cast: any[];
  trailerKey: string | null;
  similar: any[];
  providers: any[];
  ratingSummary: { average: number; count: number };
  myRating: number | null;
}) {
  const { movie } = bundle;
  return {
    id: movie.id,
    media_type: "movie" as const,
    title: movie.title,
    overview: movie.overview || "",
    poster_path: resolveImageUrl(movie.poster, movie.posterSource, "w500"),
    backdrop_path: resolveImageUrl(movie.backdrop, movie.backdropSource, "w1280"),
    trailerKey: bundle.trailerKey,
    providers: bundle.providers,
    genres: (movie.genres || []).map((mg: any) => ({ id: mg.genre.tmdbId, name: mg.genre.name })),
    year: movie.releaseDate ? String(movie.releaseDate.getFullYear()) : null,
    runtimeMinutes: movie.runtime,
    // vote_average = TMDB (no se reemplaza); nowseeRating = puntuación propia.
    vote_average: movie.rating,
    nowseeRating: { average: bundle.ratingSummary.average, count: bundle.ratingSummary.count, myRating: bundle.myRating },
    cast: serializeCast(bundle.cast),
    recommendations: bundle.similar.map(serializeMovieListItem),
  };
}

export function serializeTvDetail(bundle: {
  tvShow: any;
  cast: any[];
  trailerKey: string | null;
  similar: any[];
  providers: any[];
  ratingSummary: { average: number; count: number };
  myRating: number | null;
}) {
  const { tvShow } = bundle;
  return {
    id: tvShow.id,
    media_type: "tv" as const,
    title: tvShow.title,
    overview: tvShow.overview || "",
    poster_path: resolveImageUrl(tvShow.poster, tvShow.posterSource, "w500"),
    backdrop_path: resolveImageUrl(tvShow.backdrop, tvShow.backdropSource, "w1280"),
    trailerKey: bundle.trailerKey,
    providers: bundle.providers,
    genres: (tvShow.genres || []).map((tg: any) => ({ id: tg.genre.tmdbId, name: tg.genre.name })),
    year: tvShow.firstAirDate ? String(tvShow.firstAirDate.getFullYear()) : null,
    runtimeMinutes: null,
    vote_average: tvShow.rating,
    nowseeRating: { average: bundle.ratingSummary.average, count: bundle.ratingSummary.count, myRating: bundle.myRating },
    cast: serializeCast(bundle.cast),
    recommendations: bundle.similar.map(serializeTvListItem),
  };
}
