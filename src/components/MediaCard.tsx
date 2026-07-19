import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TrendingItem } from "../types";
import { colors, radii, fonts } from "../theme";
import RatingBadge from "./RatingBadge";

const CARD_WIDTH = 160;

/**
 * `isFavorite`/`onToggleFavorite` llegan resueltos por prop (en vez de
 * llamar useFavorites() acá adentro): así, cuando se togglea un favorito
 * en cualquier parte de la app, solo la ÚNICA card cuyo estado cambió de
 * verdad vuelve a renderizar (ver el comparador de React.memo más abajo)
 * en vez de las ~300 que puede haber montadas en el Home a la vez.
 */
function MediaCard({
  item,
  onPress,
  isFavorite,
  onToggleFavorite,
  width = CARD_WIDTH,
}: {
  item: TrendingItem;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  width?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const uri = item.poster_path;
  const year = item.release_date ? item.release_date.slice(0, 4) : null;
  const fav = isFavorite;

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
        <Pressable
          style={[styles.favoriteButton, fav && styles.favoriteButtonActive]}
          onPress={(e: any) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
          hitSlop={8}
        >
          <MaterialIcons
            name={fav ? "check" : "add"}
            size={18}
            color={fav ? colors.onPrimaryContainer : colors.onSurface}
          />
        </Pressable>
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
  favoriteButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(12,19,36,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButtonActive: { backgroundColor: colors.primaryContainer },
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

// onPress/onToggleFavorite se recrean en cada render del padre (son
// closures inline) pero siempre apuntan al mismo `item` — comparar su
// identidad haría que el memo nunca "pegue". Lo que sí importa para el
// resultado visual es item/isFavorite/width, así que el comparador mira
// solo eso.
function areEqual(prev: Readonly<Parameters<typeof MediaCard>[0]>, next: Readonly<Parameters<typeof MediaCard>[0]>) {
  return prev.item === next.item && prev.isFavorite === next.isFavorite && prev.width === next.width;
}

export default React.memo(MediaCard, areEqual);
