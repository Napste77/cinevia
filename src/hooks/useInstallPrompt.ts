import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos() {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Algunos navegadores Android (ej. Chrome en MIUI/Xiaomi) nunca disparan
// `beforeinstallprompt` aunque el sitio cumpla los criterios de instalación.
// Pasado este tiempo sin el evento, mostramos instrucciones manuales.
const MANUAL_FALLBACK_DELAY_MS = 2500;

/**
 * Expone el flujo de instalación de la PWA.
 * - Chrome/Edge/Android: captura `beforeinstallprompt` y dispara el diálogo nativo.
 * - iOS Safari: no soporta `beforeinstallprompt`; no hay diálogo programático,
 *   así que `isIos` sirve para mostrar instrucciones de "Compartir > Agregar a inicio".
 * - Resto de casos donde el navegador nunca dispara el evento (ej. MIUI): tras
 *   `MANUAL_FALLBACK_DELAY_MS` se habilita `showManualFallback` con instrucciones
 *   para instalar desde el menú del navegador.
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [fallbackTimedOut, setFallbackTimedOut] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setFallbackTimedOut(true), MANUAL_FALLBACK_DELAY_MS);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return null;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredEvent(null);
    return outcome;
  }, [deferredEvent]);

  const iosHint = isIos() && !installed;

  return {
    canInstall: !installed && !!deferredEvent,
    isIos: iosHint,
    installed,
    promptInstall,
    showManualFallback: !installed && !iosHint && !deferredEvent && fallbackTimedOut,
  };
}
