import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";

export async function listFavorites(userId: number) {
  return prisma.userFavorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function addFavorite(userId: number, contentType: ContentType, contentId: number) {
  await prisma.userFavorite.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: {},
    create: { userId, contentType, contentId },
  });
}

export async function removeFavorite(userId: number, contentType: ContentType, contentId: number) {
  await prisma.userFavorite.deleteMany({ where: { userId, contentType, contentId } });
}

/**
 * Sube a la cuenta los favoritos que el usuario tenía guardados
 * localmente (anónimo) antes de loguearse — sin pisar lo que ya tenía en
 * la cuenta (upsert). Es el "merge-on-login" que hace que Mi Lista no se
 * pierda al crear cuenta.
 */
export async function mergeFavorites(
  userId: number,
  items: { contentType: ContentType; contentId: number }[]
) {
  for (const item of items) {
    await addFavorite(userId, item.contentType, item.contentId);
  }
  return listFavorites(userId);
}
