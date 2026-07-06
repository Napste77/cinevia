import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MediaType } from "../types";

/**
 * Fuente PRIMARIA y 100% gratuita de deep links: Wikidata.
 *
 * Wikidata es datos abiertos (CC0), sin API key, sin límite de uso
 * comercial y sin costo — a diferencia de cualquier API "free tier" de
 * streaming, esto no tiene techo que se vaya a topar si NowSee crece.
 * Mantiene propiedades con el ID real de cada título en varias
 * plataformas, cruzables por el ID de TMDB:
 *
 *   P4947 / P4983  TMDB movie / TV series ID (puente para encontrar el item)
 *   P1874          Netflix ID       -> https://www.netflix.com/title/$1
 *   P7595 / P7596  Disney+ movie / series ID
 *   P9586 / P9751  Apple TV movie / show ID
 *
 * Prime Video, Max, Paramount+, Hulu y Crunchyroll todavía no tienen una
 * propiedad establecida en Wikidata (solo propuestas) — para esas
 * plataformas esta fuente no devuelve nada y el resolver cae a la
 * siguiente capa (ver src/api/streamingLinks.ts).
 *
 * Verificado en vivo contra query.wikidata.org con casos reales:
 * Stranger Things, Atrapados, Breaking Bad (Netflix) y Oppenheimer
 * (Apple TV).
 */

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const CACHE_PREFIX = "nowsee:wikidataLinks:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 días: estos IDs no cambian.

const memoryCache = new Map<string, Record<string, string>>();

function buildQuery(tmdbId: number, mediaType: MediaType) {
  const bridgeProp = mediaType === "movie" ? "P4947" : "P4983";
  return `
    SELECT ?netflixId ?disneyMovieId ?disneySeriesId ?appleMovieId ?appleShowId WHERE {
      ?item wdt:${bridgeProp} "${tmdbId}".
      OPTIONAL { ?item wdt:P1874 ?netflixId. }
      OPTIONAL { ?item wdt:P7595 ?disneyMovieId. }
      OPTIONAL { ?item wdt:P7596 ?disneySeriesId. }
      OPTIONAL { ?item wdt:P9586 ?appleMovieId. }
      OPTIONAL { ?item wdt:P9751 ?appleShowId. }
    }
  `;
}

export async function getWikidataStreamingLinks(
  tmdbId: number,
  mediaType: MediaType
): Promise<Record<string, string>> {
  const cacheKey = `${mediaType}-${tmdbId}`;

  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey)!;

  const storageKey = CACHE_PREFIX + cacheKey;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const cached = JSON.parse(raw) as { timestamp: number; links: Record<string, string> };
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        memoryCache.set(cacheKey, cached.links);
        return cached.links;
      }
    }
  } catch {
    // Cache corrupto o no disponible: seguimos a la red.
  }

  try {
    const res = await axios.get(SPARQL_ENDPOINT, {
      params: { query: buildQuery(tmdbId, mediaType), format: "json" },
      headers: {
        Accept: "application/sparql-results+json",
        // Wikidata pide un User-Agent descriptivo para no limitar el acceso,
        // pero los navegadores bloquean que JS lo pise (header prohibido por
        // el spec de fetch) — solo tiene efecto en nativo (iOS/Android).
        ...(Platform.OS !== "web"
          ? { "User-Agent": "NowSeeApp/1.0 (streaming deep links; contacto vía repo GitHub)" }
          : null),
      },
      timeout: 8000,
    });

    const binding = res.data?.results?.bindings?.[0];
    const links: Record<string, string> = {};

    if (binding) {
      const netflixId = binding.netflixId?.value;
      if (netflixId) links.netflix = `https://www.netflix.com/title/${netflixId}`;

      const disneyId =
        mediaType === "movie" ? binding.disneyMovieId?.value : binding.disneySeriesId?.value;
      if (disneyId) {
        links.disney =
          mediaType === "movie"
            ? `https://www.disneyplus.com/movies/wd/${disneyId}`
            : `https://www.disneyplus.com/series/wp/${disneyId}`;
      }

      const appleId =
        mediaType === "movie" ? binding.appleMovieId?.value : binding.appleShowId?.value;
      if (appleId) {
        links.apple =
          mediaType === "movie"
            ? `https://tv.apple.com/movie/${appleId}`
            : `https://tv.apple.com/show/${appleId}`;
      }
    }

    memoryCache.set(cacheKey, links);
    AsyncStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), links })).catch(
      () => {}
    );

    return links;
  } catch (e) {
    console.error("Error consultando Wikidata", e);
    return {};
  }
}
