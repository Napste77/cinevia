/**
 * Nunca guardamos el binario de una imagen: la base de datos solo tiene el
 * path relativo + una fuente ("tmdb", eventualmente otras). Esta es la
 * ÚNICA función que sabe cómo convertir esa referencia en una URL
 * navegable — si mañana cambiamos de fuente de imágenes, este es el único
 * lugar que hay que tocar.
 */
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function resolveImageUrl(
  path: string | null | undefined,
  source: string = "tmdb",
  size: "w200" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500"
): string | null {
  if (!path) return null;
  if (source === "tmdb") return `${TMDB_IMAGE_BASE}/${size}${path}`;
  // Fuente desconocida: si ya vino como URL absoluta, se devuelve tal cual.
  if (path.startsWith("http")) return path;
  return null;
}
