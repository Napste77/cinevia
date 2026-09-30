import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, View, StyleSheet } from "react-native";
import { getTrendingByCountry, getHomeRows } from "../api/nowsee";
import { TrendingItem, Platform } from "../types";
import { HOME_PLATFORM_ROWS } from "../config/catalog";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import Hero from "../components/Hero";
import Row from "../components/Row";
import TopBar from "../components/TopBar";
import { useFavorites } from "../hooks/useFavorites";
import { useAuth } from "../context/AuthContext";
import { useRegion } from "../context/RegionContext";
import { colors, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

const PROVIDER_IDS = HOME_PLATFORM_ROWS.map((p) => p.providerId);
// Los géneros ya no viven en el Home: tienen su propia pantalla (GenresScreen,
// accesible desde el menú). El Home queda con tendencias + plataformas.

export default function HomeScreen({ navigation }: any) {
  const { country } = useRegion();
  const { isDesktop } = useResponsive();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();

  const [trendingMovies, setTrendingMovies] = useState<TrendingItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<TrendingItem[]>([]);
  const [platformRows, setPlatformRows] = useState<Record<number, TrendingItem[]>>({});
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[] | null>(null);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);

  const visiblePlatformRows = useMemo(
    () =>
      availablePlatforms
        ? HOME_PLATFORM_ROWS.filter((p) => availablePlatforms.some((ap) => ap.id === p.providerId))
        : HOME_PLATFORM_ROWS,
    [availablePlatforms]
  );

  // Películas y series se piden por separado (no con Promise.all) para que
  // el Hero pueda pintar apenas responde la primera, en vez de esperar
  // siempre a la más lenta de las dos — mejora el LCP percibido.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMovies(true);
      try {
        const movies = await getTrendingByCountry(country, "movie");
        if (!cancelled) setTrendingMovies(movies);
      } catch (e) {
        console.error("Error cargando tendencias de películas", e);
      } finally {
        if (!cancelled) setLoadingMovies(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSeries(true);
      try {
        const series = await getTrendingByCountry(country, "tv");
        if (!cancelled) setTrendingSeries(series);
      } catch (e) {
        console.error("Error cargando tendencias de series", e);
      } finally {
        if (!cancelled) setLoadingSeries(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  // Las filas de plataforma de la región se piden en UN solo request,
  // recién cuando ya resolvió la de películas: así no compiten por las
  // conexiones concurrentes del navegador con el contenido crítico de
  // arriba (Hero + primera fila), que es lo que define el LCP percibido.
  // (Los géneros ya no se piden acá — están en su propia pantalla.)
  useEffect(() => {
    if (loadingMovies) return;
    let cancelled = false;
    setLoadingRows(true);
    getHomeRows(country, PROVIDER_IDS, [])
      .then((bundle) => {
        if (cancelled) return;
        setAvailablePlatforms(bundle.platforms);
        setPlatformRows(bundle.platformRows);
      })
      .catch((e) => console.error("Error cargando filas del Home", e))
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, loadingMovies]);

  const heroItem = useMemo(
    () => trendingMovies[0] || trendingSeries[0] || null,
    [trendingMovies, trendingSeries]
  );

  const openDetail = (item: TrendingItem) => {
    navigation.navigate("Detail", {
      id: item.id,
      mediaType: item.media_type,
      country,
    });
  };

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const openCategory = (slug: string) => navigation.navigate("Category", { slug });
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;

  // Cada fila es un item de una FlatList vertical (en vez de mapearlas
  // todas dentro de un ScrollView): así las que quedan lejos del viewport
  // (la mayoría — hay 16 en total) ni se montan ni piden sus imágenes
  // hasta que el usuario scrollea cerca, en vez de las ~150 que se
  // disparaban de una en el primer render.
  type Section =
    | { key: string; kind: "trending-movies" }
    | { key: string; kind: "trending-series" }
    | { key: string; kind: "platform"; platform: (typeof HOME_PLATFORM_ROWS)[number] };

  const sections = useMemo<Section[]>(
    () => [
      { key: "trending-movies", kind: "trending-movies" },
      { key: "trending-series", kind: "trending-series" },
      ...visiblePlatformRows.map((platform): Section => ({ key: platform.key, kind: "platform", platform })),
    ],
    [visiblePlatformRows]
  );

  const renderSection = useCallback(
    ({ item }: { item: Section }) => {
      switch (item.kind) {
        case "trending-movies":
          return (
            <View style={{ paddingHorizontal: hPad }}>
              <Row
                title="Tendencias · Películas"
                items={trendingMovies}
                loading={loadingMovies}
                onItemPress={openDetail}
                onSeeAllPress={() => openCategory("trending-movies")}
              />
            </View>
          );
        case "trending-series":
          return (
            <View style={{ paddingHorizontal: hPad }}>
              <Row
                title="Tendencias · Series"
                items={trendingSeries}
                loading={loadingSeries}
                onItemPress={openDetail}
                onSeeAllPress={() => openCategory("trending-series")}
              />
            </View>
          );
        case "platform":
          return (
            <View style={{ paddingHorizontal: hPad }}>
              <Row
                title={item.platform.label}
                items={platformRows[item.platform.providerId] || []}
                loading={loadingRows}
                onItemPress={openDetail}
                onSeeAllPress={() => openCategory(item.platform.key)}
                emptyLabel={`No encontramos catálogo de ${item.platform.label} disponible por suscripción en tu región.`}
              />
            </View>
          );
      }
    },
    [hPad, trendingMovies, trendingSeries, platformRows, loadingMovies, loadingSeries, loadingRows, country]
  );

  return (
    <AppShell active="Home" onNavigate={goTo}>
      <FlatList
        style={styles.scroll}
        data={sections}
        keyExtractor={(s) => s.key}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        initialNumToRender={3}
        windowSize={5}
        ListHeaderComponent={
          <>
            <TopBar title="Explorar" onSearchPress={() => goTo("Search")} />
            {heroItem ? (
              <Hero
                item={heroItem}
                isFavorite={isFavorite(heroItem)}
                onToggleFavorite={() =>
                  isAuthenticated ? toggleFavorite(heroItem) : navigation.navigate("Auth")
                }
                onOpenDetail={() => openDetail(heroItem)}
              />
            ) : (
              // Reserva el mismo alto que ocupará el Hero real para que no
              // haya un salto de layout enorme cuando termine de cargar
              // (ver Row.tsx para la misma idea aplicada a las filas).
              <View style={{ height: isDesktop ? 560 : 420, backgroundColor: colors.surfaceContainer }} />
            )}
          </>
        }
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
});
