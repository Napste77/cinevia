import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { TrendingItem } from "../types";
import { posterUrl } from "../api/tmdb";
import { colors, radii, fonts } from "../theme";
import RatingBadge from "./RatingBadge";

const CARD_WIDTH = 160;

export default function MediaCard({
  item,
  onPress,
  width = CARD_WIDTH,
}: {
  item: TrendingItem;
  onPress: () => void;
  width?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const uri = posterUrl(item.poster_path);
  const year = item.release_date ? item.release_date.slice(0, 4) : null;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.container, { width }]}
    >
      <View
        style={[
          styles.posterWrap,
          { width, height: width * 1.5 },
          hovered && styles.posterWrapHover,
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[styles.poster, hovered && styles.posterHover]}
          />
        ) : (
          <View style={[styles.poster, styles.placeholder]}>
            <Text style={styles.placeholderText}>{item.title}</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {item.media_type === "movie" ? "Película" : "Serie"}
          </Text>
        </View>
        <View style={styles.ratingWrap}>
          <RatingBadge value={item.vote_average} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.meta}>{year || ""}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  posterWrap: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: colors.surfaceContainer,
  },
  posterWrapHover: {
    borderColor: "rgba(160,216,0,0.5)",
  },
  poster: { width: "100%", height: "100%" },
  posterHover: {
    // @ts-ignore - transform de escala solo se aprecia en web con transition css
    transform: [{ scale: 1.04 }],
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  placeholderText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.label,
    fontSize: 12,
    textAlign: "center",
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(12,19,36,0.75)",
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    color: colors.onSurface,
    fontSize: 10,
    fontFamily: fonts.label,
  },
  ratingWrap: { position: "absolute", top: 8, right: 8 },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.label,
    fontSize: 13,
    marginTop: 8,
  },
  meta: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
