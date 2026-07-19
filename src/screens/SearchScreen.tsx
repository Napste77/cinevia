import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { searchTitles } from "../api/nowsee";
import { TrendingItem } from "../types";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import SearchBar from "../components/SearchBar";
import MediaCard from "../components/MediaCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useResponsive } from "../hooks/useResponsive";
import { useFavorites } from "../hooks/useFavorites";
import { colors, fonts, spacing } from "../theme";

export default function SearchScreen({ navigation }: any) {
  const { isDesktop, isMobile, columns, width } = useResponsive();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const [results, setResults] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchTitles(debouncedQuery.trim())
      .then((items) => {
        if (!cancelled) setResults(items);
      })
      .catch((e) => console.error("Error buscando", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const gutter = 14;
  const cardWidth = (width - hPad * 2 - gutter * (columns - 1)) / columns;

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const openDetail = (item: TrendingItem) =>
    navigation.navigate("Detail", { id: item.id, mediaType: item.media_type });

  return (
    <AppShell active="Search" onNavigate={goTo}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: hPad }]}>
          <Text style={styles.title}>Buscar</Text>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar películas, series, directores..."
            autoFocus={!isMobile}
          />
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

        {!loading && debouncedQuery.trim().length >= 2 && results.length === 0 && (
          <Text style={[styles.emptyText, { paddingHorizontal: hPad }]}>
            No encontramos resultados para "{debouncedQuery}".
          </Text>
        )}

        {!loading && debouncedQuery.trim().length < 2 && (
          <Text style={[styles.emptyText, { paddingHorizontal: hPad }]}>
            Escribí al menos 2 letras para empezar a buscar.
          </Text>
        )}

        <FlatList
          key={columns}
          data={results}
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
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingTop: 24, paddingBottom: 16, gap: 16 },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 28 },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
});
