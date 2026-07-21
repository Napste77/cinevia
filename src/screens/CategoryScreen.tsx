import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getCategoryPage, getPlatforms } from "../api/nowsee";
import { getCategoryBySlug, GENRE_ROWS } from "../config/catalog";
import { TrendingItem, Platform, MediaType } from "../types";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import MediaCard from "../components/MediaCard";
import FilterChip from "../components/FilterChip";
import YearRangeSlider from "../components/YearRangeSlider";
import { useResponsive } from "../hooks/useResponsive";
import { useRegion } from "../context/RegionContext";
import { useFavorites } from "../hooks/useFavorites";
import { useViews } from "../hooks/useViews";
import { colors, fonts, spacing } from "../theme";

type SortOption = "popularity" | "newest";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;

/** Catálogo completo de una categoría (/category/:slug), con scroll infinito y filtros combinables. */
export default function CategoryScreen({ route, navigation }: any) {
  const { slug } = route.params;
  const category = getCategoryBySlug(slug);
  const { country } = useRegion();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isViewed, toggleViewed } = useViews();
  const { isDesktop, columns, width } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const gutter = 14;
  const cardWidth = (width - hPad * 2 - gutter * (columns - 1)) / columns;

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformFilter, setPlatformFilter] = useState<number | null>(null);
  const [yearFrom, setYearFrom] = useState<number>(MIN_YEAR);
  const [yearTo, setYearTo] = useState<number>(CURRENT_YEAR);
  const [sort, setSort] = useState<SortOption>("popularity");
  // Solo se usan en páginas de plataforma ("Ver más → Netflix", etc.): ahí
  // sí tiene sentido elegir género y tipo, porque el catálogo no viene ya
  // acotado por eso (a diferencia de una página de género, donde el tipo
  // "género" ya lo fija todo).
  const [genreFilter, setGenreFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<MediaType>(category?.source.mediaType || "movie");
  const isPlatformPage = category?.source.type === "platform";

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
    () => ({
      providerId: platformFilter ?? undefined,
      yearFrom: yearFrom !== MIN_YEAR ? yearFrom : undefined,
      yearTo: yearTo !== CURRENT_YEAR ? yearTo : undefined,
      sort,
      genreId: isPlatformPage ? genreFilter ?? undefined : undefined,
      mediaType: isPlatformPage ? typeFilter : undefined,
    }),
    [platformFilter, yearFrom, yearTo, sort, isPlatformPage, genreFilter, typeFilter]
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
          <View style={{ paddingHorizontal: hPad }}>
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
            {isPlatformPage && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <FilterChip label="Películas" active={typeFilter === "movie"} onPress={() => setTypeFilter("movie")} />
                <FilterChip label="Series" active={typeFilter === "tv"} onPress={() => setTypeFilter("tv")} />
              </ScrollView>
            )}

            {isPlatformPage && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <FilterChip label="Todos los géneros" active={genreFilter === null} onPress={() => setGenreFilter(null)} />
                {GENRE_ROWS.map((g) => (
                  <FilterChip
                    key={g.key}
                    label={g.label}
                    active={genreFilter === g.genreId}
                    onPress={() => setGenreFilter(g.genreId)}
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
            </ScrollView>

            <YearRangeSlider
              min={MIN_YEAR}
              max={CURRENT_YEAR}
              from={yearFrom}
              to={yearTo}
              onChange={(f, t) => {
                setYearFrom(f);
                setYearTo(t);
              }}
            />
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
            style={{ flex: 1 }}
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
                isViewed={isViewed(item)}
                onToggleViewed={() => toggleViewed(item)}
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
  container: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
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
