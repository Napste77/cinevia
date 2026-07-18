/**
 * Catálogo de géneros de TMDB. Los IDs son públicos y estables (no hace
 * falta pedirlos a /genre/movie/list en cada arranque) — se seedean una
 * sola vez en la base y de ahí en más viven ahí. Incluye los géneros de
 * películas (que es lo único que usaba el Home hasta ahora) más los
 * exclusivos de TV que no se solapan con la lista de películas.
 */
export const TMDB_GENRES: { tmdbId: number; name: string }[] = [
  { tmdbId: 28, name: "Acción" },
  { tmdbId: 12, name: "Aventura" },
  { tmdbId: 16, name: "Animación" },
  { tmdbId: 35, name: "Comedia" },
  { tmdbId: 80, name: "Crimen" },
  { tmdbId: 99, name: "Documentales" },
  { tmdbId: 18, name: "Drama" },
  { tmdbId: 10751, name: "Familia" },
  { tmdbId: 14, name: "Fantasía" },
  { tmdbId: 36, name: "Historia" },
  { tmdbId: 27, name: "Terror" },
  { tmdbId: 10402, name: "Música" },
  { tmdbId: 9648, name: "Misterio" },
  { tmdbId: 10749, name: "Romance" },
  { tmdbId: 878, name: "Ciencia ficción" },
  { tmdbId: 10770, name: "Película de TV" },
  { tmdbId: 53, name: "Suspenso" },
  { tmdbId: 10752, name: "Bélica" },
  { tmdbId: 37, name: "Western" },
  // Exclusivos de series de TV (IDs distintos a los de película en TMDB).
  { tmdbId: 10759, name: "Acción y aventura" },
  { tmdbId: 10762, name: "Infantil" },
  { tmdbId: 10763, name: "Noticias" },
  { tmdbId: 10764, name: "Reality" },
  { tmdbId: 10765, name: "Sci-Fi y fantasía" },
  { tmdbId: 10766, name: "Telenovela" },
  { tmdbId: 10767, name: "Talk show" },
  { tmdbId: 10768, name: "Bélica y política" },
];
