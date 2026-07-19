import { Linking, Platform } from "react-native";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/**
 * Empaquetado con Capacitor (APK de Android), `Platform.OS` de
 * react-native-web sigue devolviendo "web" — seguimos corriendo el mismo
 * bundle web, solo que adentro de un WebView nativo en vez de una pestaña
 * de navegador. `Capacitor.isNativePlatform()` es la única forma de
 * distinguir "browser real" de "WebView empaquetado" en ese caso.
 */
export function isCapacitorNative() {
  return Capacitor.isNativePlatform();
}

/**
 * Abre una URL de streaming resuelta por `resolveStreamingLink`
 * (universal link / app link oficial, o su fallback de búsqueda).
 *
 * Dentro del WebView de Capacitor, navegar el WebView mismo (o un <a href>
 * normal) saca a la app de su propia UI sin ningún chrome de navegador
 * para volver — por eso ahí se abre con el plugin Browser (Chrome Custom
 * Tabs/SFSafariViewController), que deja la app de fondo intacta.
 *
 * En web real, los botones se renderizan como `<a href>` (ver
 * ProviderBadge) — un tap nativo sobre un anchor es lo único que funciona
 * de forma confiable en todos los navegadores/dispositivos; un click
 * disparado por JS puede quedar bloqueado en Chrome Android o dentro de
 * una PWA instalada en modo standalone. En nativo nativo (RN puro, no
 * Capacitor) se usa Linking.openURL, que dispara la universal/app link y
 * cae a la web si la app no está instalada.
 */
export async function openStreamingLink(url: string) {
  if (isCapacitorNative()) {
    await Browser.open({ url });
    return;
  }
  if (Platform.OS === "web") {
    window.location.assign(url);
    return;
  }
  await Linking.openURL(url);
}
