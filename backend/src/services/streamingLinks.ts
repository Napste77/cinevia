import { prisma } from "../db/prisma";
import { ContentType } from "@prisma/client";
import { tmdbGetWatchProviders } from "../providers/tmdb";
import { getWikidataStreamingLinks } from "../providers/wikidata";
import { getStreamingAvailabilityLinks } from "../providers/streamingAvailability";
import { getPlatformByTmdbId } from "../data/platforms";
import { getStreamingLinkOverrides } from "../data/streamingLinkOverrides";
import { resolveImageUrl } from "../utils/media";

/** Deep link real confirmado: se reusa por mucho tiempo, casi no cambian. */
const VERIFIED_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días
/**
 * No encontramos deep link real (quedamos con el fallback de búsqueda):
 * reintentar en bastante menos tiempo, por si Wikidata/la API paga
 * suman el dato más adelante — pero SIN reintentar en cada request, que
 * es justamente lo que "caché inteligente" pide evitar.
 */
const UNVERIFIED_RETRY_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 días

function isFresh(lastChecked: Date | null, ttlMs: number) {
  if (!lastChecked) return false;
  return Date.now() - lastChecked.getTime() < ttlMs;
}

export interface ResolvedProvider {
  providerName: string;
  logo: string | null;
  color: string | null;
  url: string;
  verified: boolean;
}

/**
 * Para un título dado, devuelve TODAS las plataformas donde TMDB dice que
 * está disponible por suscripción en `country`, con la URL ya resuelta:
 *   - Si tenemos la plataforma en nuestro catálogo curado (src/data/platforms.ts)
 *     y ya la resolvimos hace menos de RESOLVE_TTL_MS, se reusa de la DB.
 *   - Si no, se resuelve (Wikidata -> Streaming Availability -> override
 *     manual -> búsqueda genérica dentro de la plataforma) y se persiste.
 *   - Si TMDB devuelve una plataforma que no tenemos curada, igual se
 *     informa con un fallback de búsqueda en Google (mismo comportamiento
 *     que tenía el frontend antes de esta migración).
 */
export async function resolveProviders(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  title: string,
  country: string
): Promise<ResolvedProvider[]> {
  const watchProviders = await tmdbGetWatchProviders(
    contentType === "movie" ? "movie" : "tv",
    tmdbId,
    country
  );
  const flatrate: any[] = watchProviders?.flatrate || [];
  if (flatrate.length === 0) return [];

  let liveLinks: Record<string, string> | null = null;

  const results: ResolvedProvider[] = [];
  for (const p of flatrate) {
    const platformDef = getPlatformByTmdbId(p.provider_id);

    if (!platformDef) {
      results.push({
        providerName: p.provider_name,
        logo: resolveImageUrl(p.logo_path, "tmdb", "w200"),
        color: null,
        url: `https://www.google.com/search?q=${encodeURIComponent(`${title} ${p.provider_name}`)}`,
        verified: false,
      });
      continue;
    }

    const platformRow = await prisma.platform.findUnique({ where: { slug: platformDef.slug } });
    if (!platformRow) continue;

    const existing = await prisma.streamingLink.findUnique({
      where: {
        content_platform_country: {
          contentType,
          contentId,
          platformId: platformRow.id,
          country,
        },
      },
    });

    const ttl = existing?.verified ? VERIFIED_TTL_MS : UNVERIFIED_RETRY_TTL_MS;
    if (existing && isFresh(existing.lastChecked, ttl)) {
      results.push({
        providerName: p.provider_name,
        logo: resolveImageUrl(p.logo_path, "tmdb", "w200"),
        color: platformDef.color,
        url: existing.providerUrl || platformDef.searchUrl(title),
        verified: existing.verified,
      });
      continue;
    }

    // Resolver en vivo: Wikidata primero (gratis/sin límite), después la API
    // paga opcional, después overrides manuales, y como último recurso la
    // búsqueda dentro de la plataforma.
    if (liveLinks === null) {
      const mediaType = contentType === "movie" ? "movie" : "tv";
      const [wikidata, availability] = await Promise.all([
        getWikidataStreamingLinks(tmdbId, mediaType),
        getStreamingAvailabilityLinks(tmdbId, mediaType, country),
      ]);
      liveLinks = { ...availability, ...wikidata };
    }

    const overrides = getStreamingLinkOverrides();
    const overrideUrl = overrides[`${contentType}-${tmdbId}`]?.[platformDef.slug];
    const resolvedUrl = liveLinks[platformDef.slug] || overrideUrl;
    const url = resolvedUrl || platformDef.searchUrl(title);
    const verified = Boolean(resolvedUrl);

    await prisma.streamingLink.upsert({
      where: {
        content_platform_country: {
          contentType,
          contentId,
          platformId: platformRow.id,
          country,
        },
      },
      update: { providerUrl: url, verified, lastChecked: new Date() },
      create: {
        contentType,
        contentId,
        platformId: platformRow.id,
        country,
        providerUrl: url,
        verified,
        lastChecked: new Date(),
      },
    });

    results.push({
      providerName: p.provider_name,
      logo: resolveImageUrl(p.logo_path, "tmdb", "w200"),
      color: platformDef.color,
      url,
      verified,
    });
  }

  return results;
}
