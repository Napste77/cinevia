import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MediaType } from "../types";

/**
 * Cliente de la "Streaming Availability API" (movieofthenight.com, vía
 * RapidAPI). Es la fuente que resuelve el link EXACTO de cada título en
 * cada plataforma (no una búsqueda por nombre): acepta el ID de TMDB
 * directamente y devuelve, por país, la lista de plataformas donde está
 * disponible junto con un `link` garantizado a la ficha real del título.
 *
 * Docs: https://docs.movieofthenight.com/guide/shows
 * Free tier: 100 requests/día, sin tarjeta. Por eso cacheamos agresivo
 * (memoria + AsyncStorage con TTL) — solo se pide una vez por título por
 * bastante tiempo, no en cada render.
 */

const API_HOST = "streaming-availability.p.rapidapi.com";
const API_KEY = process.env.EXPO_PUBLIC_STREAMING_AVAILABILITY_API_KEY;

const CACHE_PREFIX = "nowsee:streamingLinks:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días: los deep links de un título casi no cambian.

/** service.id de la API -> key interna de src/config/streamingPlatforms.ts */
const SERVICE_ID_MAP: Record<string, string> = {
  netflix: "netflix",
  prime: "prime",
  disney: "disney",
  apple: "apple",
  hbo: "max", // la API llama "hbo" al servicio que nosotros mostramos como "Max"
  paramount: "paramount",
  hulu: "hulu",
  crunchyroll: "crunchyroll",
};

const memoryCache = new Map<string, Record<string, string>>();

/**
 * Devuelve un mapa `platformKey -> deep link exacto` para un título, según
 * la región pedida. Si no hay API key configurada, o la request falla, o
 * la plataforma no está en SERVICE_ID_MAP, devuelve un objeto vacío (el
 * caller debe hacer fallback a overrides manuales / búsqueda).
 */
export async function getStreamingAvailabilityLinks(
  tmdbId: number,
  mediaType: MediaType,
  country: string
): Promise<Record<string, string>> {
  const region = country.toLowerCase();
  const cacheKey = `${mediaType}-${tmdbId}-${region}`;

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

  if (!API_KEY) return {};

  try {
    const path = mediaType === "movie" ? `movie/${tmdbId}` : `tv/${tmdbId}`;
    const res = await axios.get(`https://${API_HOST}/shows/${path}`, {
      params: { country: region },
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST,
      },
      timeout: 8000,
    });

    const options: any[] = res.data?.streamingOptions?.[region] || [];
    const links: Record<string, string> = {};
    for (const opt of options) {
      const platformKey = SERVICE_ID_MAP[opt?.service?.id];
      if (platformKey && opt?.link && !links[platformKey]) {
        links[platformKey] = opt.link;
      }
    }

    memoryCache.set(cacheKey, links);
    AsyncStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), links })).catch(
      () => {}
    );

    return links;
  } catch (e) {
    console.error("Error consultando Streaming Availability API", e);
    return {};
  }
}
