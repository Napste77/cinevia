import { Linking, Platform } from "react-native";

/**
 * Abre una URL de streaming resuelta por `resolveStreamingLink`
 * (universal link / app link oficial, o su fallback de búsqueda).
 *
 * No hay lógica de "detectar si la app está instalada": las universal
 * links (iOS) / app links (Android) son URLs https normales que el
 * propio sistema operativo intercepta para abrir la app si está
 * instalada, y si no, simplemente cargan la página web — el mismo
 * comportamiento que un link compartido oficialmente. En desktop no hay
 * app que intercepte nada, así que se abre la página web tal cual.
 */
export async function openStreamingLink(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Linking.openURL(url);
}
