import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Provider } from "../types";
import { colors, radii, fonts } from "../theme";

export default function ProviderBadge({
  provider,
  onPress,
}: {
  provider: Provider;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
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
    borderRadius: radii.md,
    width: 92,
  },
  logo: { width: 48, height: 48, borderRadius: radii.sm, marginBottom: 8 },
  name: {
    color: colors.onSurface,
    fontFamily: fonts.label,
    fontSize: 11,
    textAlign: "center",
  },
});
