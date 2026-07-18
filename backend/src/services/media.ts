import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { tmdbGetDetail, tmdbGetImages } from "../providers/tmdb";
import { upsertMovie } from "./movies";
import { upsertTv } from "./tv";
import { withRetry } from "../utils/withRetry";

async function upsertCastMember(tmdbCastId: number, name: string, profilePath: string | null) {
  return prisma.cast.upsert({
    where: { tmdbId: tmdbCastId },
    update: { name, photo: profilePath },
    create: { tmdbId: tmdbCastId, name, photo: profilePath },
  });
}

/**
 * Sincroniza lo que cambia poco (cast, tráiler, imágenes, recomendaciones)
 * — cadencia semanal según el spec, a diferencia de rating/popularity que
 * se resincroniza a diario. Recibe `detailBundle` opcional para reusar una
 * llamada a TMDB ya hecha (ej. cuando getOrFetchMovie/Tv acaba de pedirla)
 * en vez de volver a pedirla.
 */
export async function syncContentMedia(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  detailBundle?: Awaited<ReturnType<typeof tmdbGetDetail>>
) {
  // Todo el cuerpo es delete+recreate por content_id: si dos syncs para el
  // mismo título corren en paralelo (ej. un job y una vista de detalle a
  // la vez) puede haber un deadlock transitorio en MySQL — reintentar
  // desde cero es seguro (todo es idempotente) y más simple que parchear
  // cada escritura suelta.
  return withRetry(() => runSyncContentMedia(contentType, contentId, tmdbId, detailBundle));
}

async function runSyncContentMedia(
  contentType: ContentType,
  contentId: number,
  tmdbId: number,
  detailBundle?: Awaited<ReturnType<typeof tmdbGetDetail>>
) {
  const mediaType = contentType === "movie" ? "movie" : "tv";
  const bundle = detailBundle ?? (await tmdbGetDetail(mediaType, tmdbId));

  // --- Cast ---
  await prisma.contentCast.deleteMany({ where: { contentType, contentId } });
  const castSlice = bundle.credits.cast.slice(0, 12);
  for (let i = 0; i < castSlice.length; i++) {
    const c = castSlice[i];
    const actor = await upsertCastMember(c.id, c.name, c.profile_path ?? null);
    await prisma.contentCast.upsert({
      where: { contentType_contentId_actorId: { contentType, contentId, actorId: actor.id } },
      update: { character: c.character ?? null, order: i },
      create: { contentType, contentId, actorId: actor.id, character: c.character ?? null, order: i },
    });
  }

  // --- Video (tráiler oficial) ---
  const trailer = bundle.videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer");
  if (trailer) {
    await prisma.video.upsert({
      where: {
        contentType_contentId_youtubeId: { contentType, contentId, youtubeId: trailer.key },
      },
      update: { type: "trailer", official: Boolean(trailer.official) },
      create: {
        contentType,
        contentId,
        type: "trailer",
        youtubeId: trailer.key,
        official: Boolean(trailer.official),
      },
    });
  }

  // --- Imágenes adicionales (solo referencias, nunca el binario): nada en
  // la respuesta al usuario las lee todavía, así que se resuelven en
  // background para no sumarle a la ficha una llamada a TMDB más de la
  // que ya necesita para cast/tráiler/recomendaciones.
  syncImages(contentType, contentId, mediaType, tmdbId).catch((e) =>
    console.error(`Error sincronizando imágenes de ${contentType} ${contentId}:`, e)
  );

  // --- Recomendaciones -> SimilarContent (guarda también el contenido
  // recomendado, si todavía no existía) ---
  await prisma.similarContent.deleteMany({
    where: { contentAType: contentType, contentAId: contentId },
  });
  for (const raw of bundle.recommendations.slice(0, 12)) {
    const related = contentType === "movie" ? await upsertMovie(raw) : await upsertTv(raw);
    await prisma.similarContent.upsert({
      where: {
        contentAType_contentAId_contentBType_contentBId: {
          contentAType: contentType,
          contentAId: contentId,
          contentBType: contentType,
          contentBId: related.id,
        },
      },
      update: { score: raw.vote_average ?? 0 },
      create: {
        contentAType: contentType,
        contentAId: contentId,
        contentBType: contentType,
        contentBId: related.id,
        score: raw.vote_average ?? 0,
      },
    });
  }

  if (contentType === "movie") {
    await prisma.movie.update({ where: { id: contentId }, data: { lastMediaSync: new Date() } });
  } else {
    await prisma.tVShow.update({ where: { id: contentId }, data: { lastMediaSync: new Date() } });
  }
}

async function syncImages(contentType: ContentType, contentId: number, mediaType: "movie" | "tv", tmdbId: number) {
  const images = await tmdbGetImages(mediaType, tmdbId).catch(() => null);
  if (!images) return;

  await prisma.image.deleteMany({ where: { contentType, contentId } });
  const rows = [
    ...images.posters.slice(0, 5).map((i: any) => ({ type: "poster" as const, ...i })),
    ...images.backdrops.slice(0, 5).map((i: any) => ({ type: "backdrop" as const, ...i })),
    ...images.logos.slice(0, 5).map((i: any) => ({ type: "logo" as const, ...i })),
  ];
  if (rows.length === 0) return;

  await prisma.image.createMany({
    data: rows.map((r) => ({
      contentType,
      contentId,
      type: r.type,
      filePath: r.file_path,
      width: r.width ?? null,
      height: r.height ?? null,
      language: r.iso_639_1 ?? null,
    })),
  });
}

export async function getCastFor(contentType: ContentType, contentId: number) {
  const rows = await prisma.contentCast.findMany({
    where: { contentType, contentId },
    include: { actor: true },
    orderBy: { order: "asc" },
  });
  return rows.map((r) => ({
    id: r.actor.id,
    name: r.actor.name,
    character: r.character,
    profile_path: r.actor.photo,
  }));
}

export async function getTrailerFor(contentType: ContentType, contentId: number) {
  const video = await prisma.video.findFirst({ where: { contentType, contentId, type: "trailer" } });
  return video?.youtubeId ?? null;
}

export async function getSimilarFor(contentType: ContentType, contentId: number) {
  const rows = await prisma.similarContent.findMany({
    where: { contentAType: contentType, contentAId: contentId },
    orderBy: { score: "desc" },
  });
  const movieIds = rows.filter((r) => r.contentBType === "movie").map((r) => r.contentBId);
  const tvIds = rows.filter((r) => r.contentBType === "tv").map((r) => r.contentBId);

  const [movies, tvShows] = await Promise.all([
    movieIds.length ? prisma.movie.findMany({ where: { id: { in: movieIds } } }) : [],
    tvIds.length ? prisma.tVShow.findMany({ where: { id: { in: tvIds } } }) : [],
  ]);

  return { movies, tvShows };
}
