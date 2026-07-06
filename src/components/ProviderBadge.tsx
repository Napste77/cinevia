import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Provider } from "../types";
import { colors, radii, fonts } from "../theme";
import { getPlatformByName } from "../config/streamingPlatforms";

export default function ProviderBadge({
  provider,
  onPress,
}: {
  provider: Provider;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const platform = getPlatformByName(provider.provider_name);
  const accentColor = platform?.color || colors.primary;

  return (
    <Pressable
      onPress={onPress}
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
