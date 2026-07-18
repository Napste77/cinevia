import { ContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { HttpError } from "../middleware/errorHandler";

const COMMENT_USER_SELECT = { id: true, name: true, avatarUrl: true } as const;

export async function listComments(
  contentType: ContentType,
  contentId: number,
  page = 1,
  pageSize = 20
) {
  const [items, total] = await Promise.all([
    prisma.userComment.findMany({
      where: { contentType, contentId, parentId: null },
      include: { user: { select: COMMENT_USER_SELECT } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.userComment.count({ where: { contentType, contentId, parentId: null } }),
  ]);
  return { items, total, page };
}

export async function createComment(
  userId: number,
  contentType: ContentType,
  contentId: number,
  body: string
) {
  const trimmed = body?.trim();
  if (!trimmed) throw new HttpError(400, "El comentario no puede estar vacío");
  if (trimmed.length > 2000) throw new HttpError(400, "El comentario es demasiado largo (máx. 2000)");

  return prisma.userComment.create({
    data: { userId, contentType, contentId, body: trimmed },
    include: { user: { select: COMMENT_USER_SELECT } },
  });
}

export async function updateComment(userId: number, commentId: number, body: string) {
  const existing = await prisma.userComment.findUnique({ where: { id: commentId } });
  if (!existing) throw new HttpError(404, "Comentario no encontrado");
  if (existing.userId !== userId) throw new HttpError(403, "No podés editar el comentario de otro usuario");

  const trimmed = body?.trim();
  if (!trimmed) throw new HttpError(400, "El comentario no puede estar vacío");

  return prisma.userComment.update({
    where: { id: commentId },
    data: { body: trimmed },
    include: { user: { select: COMMENT_USER_SELECT } },
  });
}

export async function deleteComment(userId: number, commentId: number) {
  const existing = await prisma.userComment.findUnique({ where: { id: commentId } });
  if (!existing) throw new HttpError(404, "Comentario no encontrado");
  if (existing.userId !== userId) throw new HttpError(403, "No podés borrar el comentario de otro usuario");

  await prisma.userComment.delete({ where: { id: commentId } });
}
