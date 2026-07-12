import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getCategoryPage } from "../api/tmdb";
import { DEFAULT_COUNTRY, getCategoryBySlug } from "../config/catalog";
import { TrendingItem } from "../types";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import MediaCard from "../components/MediaCard";
import { useResponsive } from "../hooks/useResponsive";
import { colors, fonts, spacing } from "../theme";

/** Catálogo completo de una categoría (/category/:slug), con scroll infinito. */
export default function CategoryScreen({ route, navigation }: any) {
  const { slug } = route.params;
  const category = getCategoryBySlug(slug);
  const { isDesktop, columns, width } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const gutter = 14;
  const cardWidth = (width - hPad * 2 - gutter * (columns - 1)) / columns;

  const [items, setItems] = useState<TrendingItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

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
    getCategoryPage(DEFAULT_COUNTRY, category.source, 1)
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
  }, [slug]);

  const loadMore = useCallback(() => {
    if (!category || loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    getCategoryPage(DEFAULT_COUNTRY, category.source, nextPage)
      .then(({ items: more, totalPages: tp }) => {
        setItems((prev) => [...prev, ...more]);
        setPage(nextPage);
        setTotalPages(tp);
      })
      .catch((e) => console.error("Error cargando más resultados", e))
      .finally(() => setLoadingMore(false));
  }, [category, loading, loadingMore, page, totalPages]);

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home");
  const openDetail = (item: TrendingItem) =>
    navigation.navigate("Detail", {
      id: item.id,
      mediaType: item.media_type,
      country: DEFAULT_COUNTRY,
    });

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
            No encontramos contenido para esta categoría todavía.
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
              <MediaCard item={item} onPress={() => openDetail(item)} width={cardWidth} />
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
  message: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
});
