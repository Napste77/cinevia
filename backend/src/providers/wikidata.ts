import axios from "axios";

/**
 * Wikidata: fuente primaria y gratuita de deep links exactos (portado
 * desde el frontend — antes vivía en src/api/wikidataStreamingIds.ts y lo
 * llamaba el cliente directo). Datos abiertos (CC0), sin API key, sin
 * límite de uso comercial.
 *
 *   P4947 / P4983  TMDB movie / TV series ID (puente para encontrar el item)
 *   P1874          Netflix ID       -> https://www.netflix.com/title/$1
 *   P7595 / P7596  Disney+ movie / series ID
 *   P9586 / P9751  Apple TV movie / show ID
 */
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

function buildQuery(tmdbId: number, mediaType: "movie" | "tv") {
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

/** Mapa platformSlug -> URL exacta, según lo que encuentre Wikidata para ese título. */
export async function getWikidataStreamingLinks(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<Record<string, string>> {
  try {
    const res = await axios.get(SPARQL_ENDPOINT, {
      params: { query: buildQuery(tmdbId, mediaType), format: "json" },
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "NowSeeBackend/1.0 (streaming deep links; contacto vía repo GitHub)",
      },
      timeout: 8000,
    });

    const binding = res.data?.results?.bindings?.[0];
    const links: Record<string, string> = {};
    if (!binding) return links;

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

    const appleId = mediaType === "movie" ? binding.appleMovieId?.value : binding.appleShowId?.value;
    if (appleId) {
      links.apple =
        mediaType === "movie"
          ? `https://tv.apple.com/movie/${appleId}`
          : `https://tv.apple.com/show/${appleId}`;
    }

    return links;
  } catch (e) {
    console.error("Error consultando Wikidata:", (e as any)?.message || e);
    return {};
  }
}
