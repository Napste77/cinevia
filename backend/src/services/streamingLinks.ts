import { prisma } from "../db/prisma";
import { ContentType } from "@prisma/client";
import { tmdbGetWatchProviders } from "../providers/tmdb";
import { getWikidataStreamingLinks } from "../providers/wikidata";
import { getStreamingAvailabilityLinks } from "../providers/streamingAvailability";
import { getPlatformByTmdbId, PlatformDef } from "../data/platforms";
import { listPlatforms } from "./platforms";
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

interface PendingResolution {
  platformDef: PlatformDef;
  platformRowId: number;
  fallbackUrl: string;
}

/**
 * Para un título dado, devuelve TODAS las plataformas donde TMDB dice que
 * está disponible por suscripción en `country`, con la URL ya resuelta:
 *   - Si tenemos la plataforma en nuestro catálogo curado (src/data/platforms.ts)
 *     y ya la resolvimos hace menos de RESOLVE_TTL_MS, se reusa de la DB.
 *   - Si no, se responde YA con el fallback de búsqueda dentro de la
 *     plataforma (misma UX que "no encontrado") y el deep link real
 *     (Wikidata / Streaming Availability / overrides) se resuelve en
 *     background: esas consultas pueden tardar varios segundos y no tiene
 *     sentido bloquear la respuesta de la ficha esperándolas — la próxima
 *     vez que alguien la abra ya va a estar resuelto y cacheado.
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

  const results: ResolvedProvider[] = [];
  const pending: PendingResolution[] = [];

  // Antes este bloque hacía, EN SERIE y por cada plataforma del título,
  // un platform.findUnique + un streamingLink.findUnique — con 4-5
  // plataformas eran ~10 viajes seriales a la MySQL remota (~300ms cada
  // uno desde Render a Hostinger: varios segundos solo acá). Ahora:
  // el catálogo de plataformas sale de una sola query (y el resto se
  // resuelve en memoria) y todos los streaming_links del título salen en
  // UNA query batcheada.
  const curated = flatrate
    .map((p: any) => ({ p, platformDef: getPlatformByTmdbId(p.provider_id) }))
    .filter((x: any) => x.platformDef);

  // El catálogo de plataformas sale del cache en memoria (services/platforms.ts,
  // TTL 10 min) — cero viajes a la DB para esto en el caso típico.
  const slugSet = new Set(curated.map((x: any) => x.platformDef!.slug));
  const allPlatforms = await listPlatforms();
  const platformRows = allPlatforms.filter((r: any) => slugSet.has(r.slug));
  const platformBySlug = new Map<string, any>(platformRows.map((r: any) => [r.slug, r]));

  const platformIds: number[] = platformRows.map((r: any) => r.id);
  const links = platformIds.length
    ? await prisma.streamingLink.findMany({
        where: { contentType, contentId, country, platformId: { in: platformIds } },
      })
    : [];
  const linkByPlatformId = new Map<number, any>(links.map((l: any) => [l.platformId, l]));

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

    const platformRow = platformBySlug.get(platformDef.slug);
    if (!platformRow) continue;

    const existing = linkByPlatformId.get(platformRow.id);

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

    results.push({
      providerName: p.provider_name,
      logo: resolveImageUrl(p.logo_path, "tmdb", "w200"),
      color: platformDef.color,
      url: existing?.providerUrl || platformDef.searchUrl(title),
      verified: existing?.verified ?? false,
    });
    pending.push({ platformDef, platformRowId: platformRow.id, fallbackUrl: platformDef.searchUrl(title) });
  }

  if (pending.length > 0) {
    resolvePendingLinksInBackground(contentType, contentId, tmdbId, country, pending).catch((e) =>
      console.error("Error resolviendo deep links en background:", e)
    );
  }

  return results;
}

/**
 * Wikidata (SPARQL) y Streaming Availability pueden tardar varios segundos
 * o directamente colgarse — por eso corren desacopladas de la respuesta al
 * usuario. Actualiza streaming_links para que la PRÓXIMA vista de esta
 * ficha ya sirva el deep link real desde caché.
 */
async function resolvePendingLinksInBackground(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  country: string,
  pending: PendingResolution[]
) {
  const mediaType = contentType === "movie" ? "movie" : "tv";
  const [wikidata, availability] = await Promise.all([
    getWikidataStreamingLinks(tmdbId, mediaType),
    getStreamingAvailabilityLinks(tmdbId, mediaType, country),
  ]);
  const liveLinks = { ...availability, ...wikidata };
  const overrides = getStreamingLinkOverrides();

  for (const { platformDef, platformRowId, fallbackUrl } of pending) {
    const overrideUrl = overrides[`${contentType}-${tmdbId}`]?.[platformDef.slug];
    const resolvedUrl = liveLinks[platformDef.slug] || overrideUrl;
    const url = resolvedUrl || fallbackUrl;
    const verified = Boolean(resolvedUrl);

    await prisma.streamingLink.upsert({
      where: {
        content_platform_country: {
          contentType,
          contentId,
          platformId: platformRowId,
          country,
        },
      },
      update: { providerUrl: url, verified, lastChecked: new Date() },
      create: {
        contentType,
        contentId,
        platformId: platformRowId,
        country,
        providerUrl: url,
        verified,
        lastChecked: new Date(),
      },
    });
  }
}
