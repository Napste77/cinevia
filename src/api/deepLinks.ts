import { Linking, Platform } from "react-native";

/**
 * Abre una URL de streaming resuelta por `resolveStreamingLink`
 * (universal link / app link oficial, o su fallback de búsqueda).
 *
 * En web, los botones ya se renderizan como `<a href>` reales (ver
 * ProviderBadge) — un tap nativo sobre un anchor es lo único que
 * funciona de forma confiable en todos los navegadores/dispositivos;
 * un click disparado por JS (`element.click()` o `window.open`) puede
 * quedar bloqueado en Chrome Android o dentro de una PWA instalada en
 * modo standalone. Esta función solo se usa en nativo (iOS/Android),
 * donde Linking.openURL sí dispara la universal link / app link
 * correctamente y cae a la web si la app no está instalada.
 */
export async function openStreamingLink(url: string) {
  if (Platform.OS === "web") {
    window.location.assign(url);
    return;
  }
  await Linking.openURL(url);
}
