import { discoverMovies } from "./movies";
import { listPlatforms, listPlatformsByCountry } from "./platforms";

/**
 * Las filas de plataforma/género del Home (14 en total) + la lista de
 * plataformas de la región antes eran 15 requests HTTP separados, cada
 * uno pagando su propio viaje navegador -> Render -> MySQL (Hostinger,
 * otro proveedor) — carísimo en conexiones de velocidad media. Tendencias
 * de películas/series se piden aparte (ver /movies/trending,
 * /series/trending): esas quedan sueltas a propósito, porque el Home
 * pinta el Hero apenas responde la primera sin esperar a esto.
 */
export async function getHomeRowsBundle(country: string, providerIds: number[], genreIds: number[]) {
  const [platforms, platformRowsList, genreRowsList] = await Promise.all([
    listPlatformsByCountry(country).catch(() => listPlatforms()),
    Promise.all(
      providerIds.map((id) => discoverMovies({ platformTmdbId: id, country, page: 1 }).catch(() => []))
    ),
    Promise.all(
      genreIds.map((id) => discoverMovies({ genreTmdbId: id, country, page: 1 }).catch(() => []))
    ),
  ]);

  const platformRows: Record<number, any[]> = {};
  providerIds.forEach((id, i) => {
    platformRows[id] = platformRowsList[i];
  });

  const genreRows: Record<number, any[]> = {};
  genreIds.forEach((id, i) => {
    genreRows[id] = genreRowsList[i];
  });

  return { platforms, platformRows, genreRows };
}
