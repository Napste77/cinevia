import axios from "axios";

/**
 * Streaming Availability API (movieofthenight.com, vía RapidAPI).
 * Portado desde el frontend (antes en src/api/streamingAvailability.ts).
 * Opcional: si no hay STREAMING_AVAILABILITY_API_KEY configurada, esta
 * fuente simplemente no aporta nada y el resolver cae a Wikidata/overrides.
 */
const API_HOST = "streaming-availability.p.rapidapi.com";
const API_KEY = process.env.STREAMING_AVAILABILITY_API_KEY;

/** service.id de la API -> slug interno de src/data/platforms.ts */
const SERVICE_ID_MAP: Record<string, string> = {
  netflix: "netflix",
  prime: "prime",
  disney: "disney",
  apple: "apple",
  hbo: "max",
  paramount: "paramount",
  hulu: "hulu",
  crunchyroll: "crunchyroll",
};

export async function getStreamingAvailabilityLinks(
  tmdbId: number,
  mediaType: "movie" | "tv",
  country: string
): Promise<Record<string, string>> {
  if (!API_KEY) return {};

  try {
    const region = country.toLowerCase();
    const path = mediaType === "movie" ? `movie/${tmdbId}` : `tv/${tmdbId}`;
    const res = await axios.get(`https://${API_HOST}/shows/${path}`, {
      params: { country: region },
      headers: { "X-RapidAPI-Key": API_KEY, "X-RapidAPI-Host": API_HOST },
      timeout: 8000,
    });

    const options: any[] = res.data?.streamingOptions?.[region] || [];
    const links: Record<string, string> = {};
    for (const opt of options) {
      const slug = SERVICE_ID_MAP[opt?.service?.id];
      if (slug && opt?.link && !links[slug]) links[slug] = opt.link;
    }
    console.log(
      `[streamingAvailability] tmdb=${tmdbId} region=${region}: ${options.length} opciones crudas, servicios=${options.map((o) => o?.service?.id).join(",")}, resueltos=${Object.keys(links).join(",") || "ninguno"}`
    );
    return links;
  } catch (e: any) {
    console.error(
      "Error consultando Streaming Availability API:",
      e?.response?.status,
      e?.response?.data ?? e?.message ?? e
    );
    return {};
  }
}
