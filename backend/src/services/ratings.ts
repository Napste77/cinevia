import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { HttpError } from "../middleware/errorHandler";

export async function getRatingSummary(contentType: ContentType, contentId: number) {
  const agg = await prisma.userRating.aggregate({
    where: { contentType, contentId },
    _avg: { value: true },
    _count: { value: true },
  });
  return { average: agg._avg.value ?? 0, count: agg._count.value };
}

export async function getUserRating(userId: number, contentType: ContentType, contentId: number) {
  const row = await prisma.userRating.findUnique({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
  });
  return row?.value ?? null;
}

/** 1 a 10, una por usuario+contenido — no reemplaza el rating de TMDB. */
export async function rateContent(
  userId: number,
  contentType: ContentType,
  contentId: number,
  value: number
) {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new HttpError(400, "La calificación debe ser un entero entre 1 y 10");
  }
  await prisma.userRating.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: { value },
    create: { userId, contentType, contentId, value },
  });
  return getRatingSummary(contentType, contentId);
}

export async function deleteRating(userId: number, contentType: ContentType, contentId: number) {
  await prisma.userRating.deleteMany({ where: { userId, contentType, contentId } });
  return getRatingSummary(contentType, contentId);
}
