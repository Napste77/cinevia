import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getCategoryPage, getPlatforms } from "../api/nowsee";
import { getCategoryBySlug } from "../config/catalog";
import { TrendingItem, Platform } from "../types";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import MediaCard from "../components/MediaCard";
import FilterChip from "../components/FilterChip";
import { useResponsive } from "../hooks/useResponsive";
import { useRegion } from "../context/RegionContext";
import { useFavorites } from "../hooks/useFavorites";
import { colors, fonts, spacing } from "../theme";

type SortOption = "popularity" | "newest";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

/** Catálogo completo de una categoría (/category/:slug), con scroll infinito y filtros combinables. */
export default function CategoryScreen({ route, navigation }: any) {
  const { slug } = route.params;
  const category = getCategoryBySlug(slug);
  const { country } = useRegion();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isDesktop, columns, width } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const gutter = 14;
  const cardWidth = (width - hPad * 2 - gutter * (columns - 1)) / columns;

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformFilter, setPlatformFilter] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("popularity");

  const [items, setItems] = useState<TrendingItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPlatforms(country)
      .then(setPlatforms)
      .catch(() => setPlatforms([]));
  }, [country]);

  const extraFilters = useMemo(
    () => ({ providerId: platformFilter ?? undefined, year: yearFilter ?? undefined, sort }),
    [platformFilter, yearFilter, sort]
  );

  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setLoading(true);
    setError(false);
    getCategoryPage(country, category.source, 1, extraFilters)
      .then(({ items: firstPage, totalPages: tp }) => {
        if (cancelled) return;
        setItems(firstPage);
        setTotalPages(tp);
      })
      .catch((e) => {
        console.error("Error cargando categoría", e);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, country, extraFilters]);

  const loadMore = useCallback(() => {
    if (!category || loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    getCategoryPage(country, category.source, nextPage, extraFilters)
      .then(({ items: more, totalPages: tp }) => {
        setItems((prev) => [...prev, ...more]);
        setPage(nextPage);
        setTotalPages(tp);
      })
      .catch((e) => console.error("Error cargando más resultados", e))
      .finally(() => setLoadingMore(false));
  }, [category, loading, loadingMore, page, totalPages, country, extraFilters]);

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home");
  const openDetail = (item: TrendingItem) =>
    navigation.navigate("Detail", { id: item.id, mediaType: item.media_type });

  return (
    <AppShell active={null} onNavigate={goTo}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: hPad }]}>
          <Pressable style={styles.backButton} onPress={goBack} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {category?.label || "Categoría"}
          </Text>
        </View>

        {category && (
          <View style={{ paddingLeft: hPad }}>
            {category.source.type !== "platform" && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <FilterChip label="Todas las plataformas" active={platformFilter === null} onPress={() => setPlatformFilter(null)} />
                {platforms.map((p) => (
                  <FilterChip
                    key={p.slug}
                    label={p.name}
                    active={platformFilter === p.id}
                    onPress={() => setPlatformFilter(p.id)}
                  />
                ))}
              </ScrollView>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <FilterChip
                label="Popularidad"
                active={sort === "popularity"}
                onPress={() => setSort("popularity")}
              />
              <FilterChip label="Más nuevo" active={sort === "newest"} onPress={() => setSort("newest")} />
              <FilterChip label="Todos los años" active={yearFilter === null} onPress={() => setYearFilter(null)} />
              {YEAR_OPTIONS.map((year) => (
                <FilterChip
                  key={year}
                  label={String(year)}
                  active={yearFilter === year}
                  onPress={() => setYearFilter(year)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {!category ? (
          <Text style={[styles.message, { paddingHorizontal: hPad }]}>
            No encontramos esta categoría.
          </Text>
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={[styles.message, { paddingHorizontal: hPad }]}>
            No pudimos cargar este catálogo.
          </Text>
        ) : items.length === 0 ? (
          <Text style={[styles.message, { paddingHorizontal: hPad }]}>
            No encontramos contenido para esta combinación de filtros.
          </Text>
        ) : (
          <FlatList
            key={columns}
            data={items}
            numColumns={columns}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: 4, paddingBottom: 48 }}
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
            onEndReachedThreshold={0.5}
            onEndReached={loadMore}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : null
            }
          />
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { flex: 1, color: colors.onSurface, fontFamily: fonts.display, fontSize: 24 },
  filterRow: { gap: 8, paddingBottom: 10, paddingRight: 16 },
  message: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
});
