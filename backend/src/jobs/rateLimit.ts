/** Espera entre llamadas a TMDB para no pasarnos de su rate limit (~40 req/10s). */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const TMDB_REQUEST_DELAY_MS = 300;
