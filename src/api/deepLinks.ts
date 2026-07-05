import { Linking, Platform } from "react-native";

/**
 * Deep links conocidos por plataforma. Los esquemas de app (netflix://, etc.)
 * en general solo abren la app en su home, no permiten abrir una ficha
 * específica ni arrancar la reproducción directamente (limitación real de
 * las plataformas, no del código). Por eso el fallback siempre es la web.
 *
 * provider_name viene tal cual de TMDB, por eso el match es por substring.
 */
const APP_SCHEMES: { match: string; ios: string; android: string; web: string }[] = [
  {
    match: "Netflix",
    ios: "nflx://",
    android: "nflx://",
    web: "https://www.netflix.com/search?q=",
  },
  {
    match: "Amazon Prime Video",
    ios: "aiv://aiv/home",
    android: "aiv://aiv/home",
    web: "https://www.primevideo.com/search/ref=atv_nb_sr?phrase=",
  },
  {
    match: "Disney Plus",
    ios: "disneyplus://",
    android: "disneyplus://",
    web: "https://www.disneyplus.com/search?q=",
  },
  {
    match: "HBO Max",
    ios: "hbomax://",
    android: "hbomax://",
    web: "https://play.max.com/search?q=",
  },
  {
    match: "Max",
    ios: "hbomax://",
    android: "hbomax://",
    web: "https://play.max.com/search?q=",
  },
  {
    match: "Star+",
    ios: "starplus://",
    android: "starplus://",
    web: "https://www.starplus.com/search?q=",
  },
];

export async function openProvider(providerName: string, titleName: string) {
  const config = APP_SCHEMES.find((s) => providerName.includes(s.match));

  // En navegador no existen los schemes de apps (nflx://, etc.),
  // directamente abrimos la búsqueda web de la plataforma.
  if (Platform.OS === "web") {
    if (config) {
      window.open(config.web + encodeURIComponent(titleName), "_blank");
    } else {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(
          titleName + " " + providerName
        )}`,
        "_blank"
      );
    }
    return;
  }

  if (!config) {
    // Plataforma sin scheme mapeado: fallback a búsqueda genérica en Google
    await Linking.openURL(
      `https://www.google.com/search?q=${encodeURIComponent(
        titleName + " " + providerName
      )}`
    );
    return;
  }

  const scheme = Platform.OS === "ios" ? config.ios : config.android;

  const canOpen = await Linking.canOpenURL(scheme);
  if (canOpen) {
    await Linking.openURL(scheme);
  } else {
    // App no instalada -> abrir búsqueda web de la plataforma
    await Linking.openURL(config.web + encodeURIComponent(titleName));
  }
}
