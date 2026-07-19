import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import MediaCard from "../components/MediaCard";
import TopBar from "../components/TopBar";
import { useFavorites } from "../hooks/useFavorites";
import { useResponsive } from "../hooks/useResponsive";
import { colors, fonts, spacing } from "../theme";
import { TrendingItem } from "../types";

export default function MyListScreen({ navigation }: any) {
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { isDesktop, columns, width } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const gutter = 14;
  const cardWidth = (width - hPad * 2 - gutter * (columns - 1)) / columns;

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const openDetail = (item: TrendingItem) =>
    navigation.navigate("Detail", { id: item.id, mediaType: item.media_type });

  return (
    <AppShell active="MyList" onNavigate={goTo}>
      <View style={styles.container}>
        <TopBar title="Mi Lista" onSearchPress={() => goTo("Search")} />

        {favorites.length === 0 ? (
          <Text style={[styles.empty, { paddingHorizontal: hPad }]}>
            Todavía no agregaste nada a tu lista. Tocá "Mi Lista" o "Agregar a
            Mi Lista" en cualquier título para guardarlo acá.
          </Text>
        ) : (
          <FlatList
            key={columns}
            data={favorites}
            numColumns={columns}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: 20, paddingBottom: 48 }}
            columnWrapperStyle={columns > 1 ? { gap: gutter } : undefined}
            ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                onPress={() => openDetail(item)}
                width={cardWidth}
                isFavorite={isFavorite(item)}
                onToggleFavorite={() => toggleFavorite(item)}
              />
            )}
          />
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  empty: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 24,
    lineHeight: 22,
  },
});
