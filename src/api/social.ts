import { client } from "./client";
import { MediaType, TrendingItem } from "../types";

export interface RatingSummary {
  average: number;
  count: number;
  myRating: number | null;
}

export async function getRatingSummary(mediaType: MediaType, id: number): Promise<RatingSummary> {
  const res = await client.get("/ratings", { params: { type: mediaType, id } });
  return res.data;
}

export async function rateContent(mediaType: MediaType, id: number, value: number): Promise<RatingSummary> {
  const res = await client.post("/ratings", { type: mediaType, id, value });
  return res.data;
}

export async function deleteRating(mediaType: MediaType, id: number): Promise<RatingSummary> {
  const res = await client.delete("/ratings", { params: { type: mediaType, id } });
  return res.data;
}

export interface Comment {
  id: number;
  userId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string | null; avatarUrl: string | null };
}

export async function listComments(
  mediaType: MediaType,
  id: number,
  page = 1
): Promise<{ items: Comment[]; total: number; page: number }> {
  const res = await client.get("/comments", { params: { type: mediaType, id, page } });
  return res.data;
}

export async function postComment(mediaType: MediaType, id: number, body: string): Promise<Comment> {
  const res = await client.post("/comments", { type: mediaType, id, body });
  return res.data;
}

export async function editComment(commentId: number, body: string): Promise<Comment> {
  const res = await client.put(`/comments/${commentId}`, { body });
  return res.data;
}

export async function deleteComment(commentId: number): Promise<void> {
  await client.delete(`/comments/${commentId}`);
}

export async function getFavorites(): Promise<TrendingItem[]> {
  const res = await client.get("/favorites");
  return res.data.results;
}

export async function addFavorite(mediaType: MediaType, id: number): Promise<void> {
  await client.post("/favorites", { type: mediaType, id });
}

export async function removeFavorite(mediaType: MediaType, id: number): Promise<void> {
  await client.delete(`/favorites/${mediaType}/${id}`);
}

/** Sube la lista local (anónima) al loguearse y devuelve la lista ya fusionada. */
export async function syncFavorites(items: TrendingItem[]): Promise<TrendingItem[]> {
  const res = await client.post("/favorites/sync", { items });
  return res.data.results;
}

export async function getViews(): Promise<TrendingItem[]> {
  const res = await client.get("/views");
  return res.data.results;
}

export async function markViewed(mediaType: MediaType, id: number): Promise<void> {
  await client.post("/views", { type: mediaType, id });
}

export async function unmarkViewed(mediaType: MediaType, id: number): Promise<void> {
  await client.delete(`/views/${mediaType}/${id}`);
}

/** Sube la lista local (anónima) de "vistos" al loguearse y devuelve la ya fusionada. */
export async function syncViews(items: TrendingItem[]): Promise<TrendingItem[]> {
  const res = await client.post("/views/sync", { items });
  return res.data.results;
}
