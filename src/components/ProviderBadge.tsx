import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { Provider } from "../types";
import { colors, radii, fonts } from "../theme";
import { getPlatformByName } from "../config/streamingPlatforms";

export default function ProviderBadge({
  provider,
  url,
  onPress,
}: {
  provider: Provider;
  /** URL resuelta a donde debe llevar el botón (web: se renderiza como <a href>). */
  url: string;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const platform = getPlatformByName(provider.provider_name);
  const accentColor = platform?.color || colors.primary;

  return (
    <Pressable
      // En web renderizamos un <a href> real: es la forma más confiable de
      // navegar en cualquier navegador/dispositivo (un click programático
      // vía JS puede quedar bloqueado en algunos Chrome/Safari mobile,
      // sobre todo dentro de una PWA instalada). En nativo seguimos
      // usando onPress + Linking.openURL (ver DetailScreen).
      {...(Platform.OS === "web"
        ? { href: url, hrefAttrs: { rel: "noopener noreferrer" } }
        : { onPress })}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.wrap, hovered && { borderColor: accentColor }]}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <Image
        source={{ uri: `https://image.tmdb.org/t/p/w200${provider.logo_path}` }}
        style={styles.logo}
      />
      <Text style={styles.name} numberOfLines={1}>
        {provider.provider_name}
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
