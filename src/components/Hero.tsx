import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { TrendingItem } from "../types";
import { backdropUrl } from "../api/tmdb";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function Hero({
  item,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
}: {
  item: TrendingItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
}) {
  const { isDesktop } = useResponsive();
  const uri = backdropUrl(item.backdrop_path);
  const height = isDesktop ? 560 : 420;

  return (
    <View style={[styles.container, { height }]}>
      {uri && <Image source={{ uri }} style={StyleSheet.absoluteFillObject} />}
      <LinearGradient
        colors={["transparent", "rgba(12,19,36,0.4)", colors.surface]}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          styles.content,
          { paddingHorizontal: isDesktop ? spacing.marginDesktop : spacing.marginMobile },
        ]}
      >
        <Text style={styles.badge}>
          {item.media_type === "movie" ? "Película destacada" : "Serie destacada"}
        </Text>
        <Text
          style={[styles.title, { fontSize: isDesktop ? 48 : 30, lineHeight: isDesktop ? 54 : 36 }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text style={styles.overview} numberOfLines={isDesktop ? 3 : 2}>
          {item.overview}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.playButton} onPress={onOpenDetail}>
            <MaterialIcons name="play-arrow" size={20} color={colors.onPrimaryContainer} />
            <Text style={styles.playText}>Ver ficha</Text>
          </Pressable>
          <Pressable style={styles.addButton} onPress={onToggleFavorite}>
            <MaterialIcons
              name={isFavorite ? "check" : "add"}
              size={20}
              color={colors.onSurface}
            />
            <Text style={styles.addText}>
              {isFavorite ? "En tu lista" : "Mi Lista"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", justifyContent: "flex-end", backgroundColor: colors.surfaceContainer },
  content: { paddingBottom: 40, maxWidth: 720 },
  badge: {
    color: colors.onPrimaryContainer,
    backgroundColor: colors.primaryContainer,
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: 14,
  },
  title: { color: colors.onSurface, fontFamily: fonts.display, marginBottom: 12 },
  overview: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: { flexDirection: "row", gap: 12 },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radii.md,
  },
  playText: { color: colors.onPrimaryContainer, fontFamily: fonts.label, fontSize: 14 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radii.md,
  },
  addText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 14 },
});
