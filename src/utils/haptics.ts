import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Feedback háptico sutil para acciones táctiles (nativo Android/iOS). En web
 * es un no-op — el navegador no tiene API equivalente confiable y queremos
 * cero ruido en consola. Todo va envuelto en catch porque en algunos
 * dispositivos/emuladores el motor háptico puede rechazar la llamada.
 */
export function tapHaptic() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successHaptic() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
