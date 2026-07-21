import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";

export async function listViews(userId: number) {
  return prisma.userView.findMany({ where: { userId }, orderBy: { viewedAt: "desc" } });
}

export async function markViewed(userId: number, contentType: ContentType, contentId: number) {
  await prisma.userView.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: { viewedAt: new Date() },
    create: { userId, contentType, contentId },
  });
}

export async function unmarkViewed(userId: number, contentType: ContentType, contentId: number) {
  await prisma.userView.deleteMany({ where: { userId, contentType, contentId } });
}

/**
 * Sube a la cuenta las marcas de "ya lo vi" que el usuario tenía guardadas
 * localmente (anónimo) antes de loguearse — mismo patrón que
 * favorites.mergeFavorites (merge-on-login, sin pisar lo que ya tenía la
 * cuenta).
 */
export async function mergeViews(
  userId: number,
  items: { contentType: ContentType; contentId: number }[]
) {
  for (const item of items) {
    await markViewed(userId, item.contentType, item.contentId);
  }
  return listViews(userId);
}
