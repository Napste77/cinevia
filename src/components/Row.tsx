import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TrendingItem } from "../types";
import MediaCard from "./MediaCard";
import { useFavorites } from "../hooks/useFavorites";
import { useViews } from "../hooks/useViews";
import { colors, fonts, spacing } from "../theme";

// Alto fijo del área de contenido (poster 160x240 + título + metadata).
// Reservarlo evita que la fila salte de tamaño cuando pasa de "cargando"
// a "con contenido" — es la principal causa de Cumulative Layout Shift
// en una pantalla que carga sus filas de a poco.
const ROW_CONTENT_HEIGHT = 284;

export default function Row({
  title,
  items,
  loading,
  onItemPress,
  onSeeAllPress,
  emptyLabel = "No encontramos contenido para esta sección todavía.",
}: {
  title: string;
  items: TrendingItem[];
  loading?: boolean;
  onItemPress: (item: TrendingItem) => void;
  onSeeAllPress?: () => void;
  emptyLabel?: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isViewed, toggleViewed } = useViews();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{title}</Text>
          {onSeeAllPress && (
            <Pressable style={styles.seeAll} onPress={onSeeAllPress} hitSlop={8}>
              <Text style={styles.seeAllText}>Ver más</Text>
              <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>
        <View style={styles.underline} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginLeft: 4 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{emptyLabel}</Text>
        ) : (
          <FlatList
            data={items}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            contentContainerStyle={{ paddingRight: spacing.marginMobile }}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                onPress={() => onItemPress(item)}
                isFavorite={isFavorite(item)}
                onToggleFavorite={() => toggleFavorite(item)}
                isViewed={isViewed(item)}
                onToggleViewed={() => toggleViewed(item)}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 32 },
  header: { marginBottom: 14 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
    fontSize: 20,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: {
    color: colors.primary,
    fontFamily: fonts.label,
    fontSize: 13,
  },
  underline: {
    height: 3,
    width: 40,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 6,
  },
  content: { height: ROW_CONTENT_HEIGHT, justifyContent: "flex-start" },
  empty: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
