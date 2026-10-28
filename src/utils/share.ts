import { Platform, Share } from "react-native";
import { TrendingItem } from "../types";

/** Dominio público del sitio — se usa para armar el link que se comparte. */
const SITE_URL = "https://nowsee.stream";

type ShareItem = Pick<TrendingItem, "id" | "media_type" | "title" | "poster_path">;

function buildShare(item: ShareItem) {
  // Mismo formato que el linking de App.tsx: title/:mediaType/:id
  const url = `${SITE_URL}/title/${item.media_type}/${item.id}`;
  const message = `Mirá lo que encontré en NowSee 👀\n\n${item.title}\n\n¿Lo vemos?`;
  return { url, message, title: item.title };
}

/**
 * Baja el póster y lo convierte en File para poder adjuntarlo al compartir
 * (solo web, best-effort). Si el CDN bloquea el fetch (CORS) o algo falla,
 * devuelve null y se comparte solo texto + link.
 */
async function posterToFile(posterUrl?: string | null, name = "nowsee.jpg"): Promise<File | null> {
  if (!posterUrl) return null;
  try {
    const res = await fetch(posterUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type || "image/jpeg" });
  } catch {
    return null;
  }
}

function isUserCancel(e: any) {
  // El usuario cerró el menú de compartir — no es un error que debamos tratar.
  return e && (e.name === "AbortError" || e.name === "NotAllowedError");
}

/**
 * Comparte una ficha con el menú nativo del sistema: Web Share API en
 * web/PWA (con imagen donde el navegador lo soporta), y el Share de React
 * Native en Android/iOS. En escritorio sin Web Share API, cae a copiar el
 * link al portapapeles. No requiere cuenta.
 */
export async function shareTitle(item: ShareItem): Promise<void> {
  const { url, message, title } = buildShare(item);

  if (Platform.OS === "web") {
    const nav: any = typeof navigator !== "undefined" ? navigator : undefined;
    const data: any = { title: "NowSee", text: message, url };
    try {
      // 1) Con imagen, si el navegador soporta compartir archivos (ej. Android Chrome)
      if (nav?.canShare && item.poster_path) {
        const file = await posterToFile(item.poster_path, `nowsee-${item.media_type}-${item.id}.jpg`);
        if (file && nav.canShare({ files: [file] })) {
          await nav.share({ ...data, files: [file] });
          return;
        }
      }
      // 2) Texto + link (Web Share API disponible, sin imagen)
      if (nav?.share) {
        await nav.share(data);
        return;
      }
    } catch (e) {
      if (isUserCancel(e)) return;
      // cualquier otro error: seguimos al fallback de abajo
    }
    // 3) Fallback escritorio: copiar al portapapeles
    try {
      await nav?.clipboard?.writeText(`${message}\n${url}`);
      if (typeof window !== "undefined") {
        window.alert("¡Link copiado! Pegalo donde quieras compartirlo ✨");
      }
    } catch {
      /* sin portapapeles disponible: no hay nada más que hacer */
    }
    return;
  }

  // Nativo (Android / iOS). En iOS message y url van separados; en Android
  // el url se ignora, así que lo concatenamos al mensaje.
  try {
    await Share.share(
      Platform.OS === "ios" ? { message, url, title } : { message: `${message}\n${url}`, title },
      { dialogTitle: "Compartir en NowSee" }
    );
  } catch {
    /* el usuario canceló el menú */
  }
}
