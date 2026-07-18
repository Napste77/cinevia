import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { ResolvedProvider } from "../types";
import { isCapacitorNative } from "../api/deepLinks";
import { colors, radii, fonts } from "../theme";

// Ver deepLinks.ts: adentro del WebView de Capacitor, Platform.OS sigue
// siendo "web" pero un <a href> normal navegaría el WebView de la app
// fuera de sí misma — ahí hace falta el onPress (que abre con el plugin
// Browser) en vez del anchor.
const useAnchor = Platform.OS === "web" && !isCapacitorNative();

export default function ProviderBadge({
  provider,
  onPress,
}: {
  provider: ResolvedProvider;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accentColor = provider.color || colors.primary;

  return (
    <Pressable
      // En web renderizamos un <a href> real: es la forma más confiable de
      // navegar en cualquier navegador/dispositivo (un click programático
      // vía JS puede quedar bloqueado en algunos Chrome/Safari mobile,
      // sobre todo dentro de una PWA instalada). En nativo (y en el WebView
      // de Capacitor) usamos onPress + Linking/Browser (ver deepLinks.ts).
      {...(useAnchor
        ? { href: provider.url, hrefAttrs: { rel: "noopener noreferrer" } }
        : { onPress })}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.wrap, hovered && { borderColor: accentColor }]}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      {provider.logo && <Image source={{ uri: provider.logo }} style={styles.logo} />}
      <Text style={styles.name} numberOfLines={1}>
        {provider.providerName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 12,
    paddingTop: 14,
    borderRadius: radii.md,
    width: 92,
    overflow: "hidden",
  },
  accent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  logo: { width: 48, height: 48, borderRadius: radii.sm, marginBottom: 8 },
  name: {
    color: colors.onSurface,
    fontFamily: fonts.label,
    fontSize: 11,
    textAlign: "center",
  },
});
