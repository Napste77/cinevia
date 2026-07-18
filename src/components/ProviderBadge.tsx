import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { ResolvedProvider } from "../types";
import { colors, radii, fonts } from "../theme";

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
      // sobre todo dentro de una PWA instalada). En nativo seguimos
      // usando onPress + Linking.openURL (ver DetailScreen).
      {...(Platform.OS === "web"
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
