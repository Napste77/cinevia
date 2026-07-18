import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { getTrendingByCountry, getHomeRows } from "../api/nowsee";
import { TrendingItem, Platform } from "../types";
import { HOME_PLATFORM_ROWS, GENRE_ROWS } from "../config/catalog";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import Hero from "../components/Hero";
import Row from "../components/Row";
import TopBar from "../components/TopBar";
import { useFavorites } from "../hooks/useFavorites";
import { useRegion } from "../context/RegionContext";
import { colors, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

const PROVIDER_IDS = HOME_PLATFORM_ROWS.map((p) => p.providerId);
const GENRE_IDS = GENRE_ROWS.map((g) => g.genreId);

export default function HomeScreen({ navigation }: any) {
  const { country } = useRegion();
  const { isDesktop } = useResponsive();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [trendingMovies, setTrendingMovies] = useState<TrendingItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<TrendingItem[]>([]);
  const [platformRows, setPlatformRows] = useState<Record<number, TrendingItem[]>>({});
  const [genreRowsData, setGenreRowsData] = useState<Record<number, TrendingItem[]>>({});
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

  // Las 15 filas restantes (plataformas de la región + una fila por
  // provider/género) se piden en UN solo request, recién cuando ya
  // resolvió la de películas: así no compiten por las conexiones
  // concurrentes del navegador con el contenido crítico de arriba (Hero +
  // primera fila), que es lo que de verdad define el LCP percibido.
  useEffect(() => {
    if (loadingMovies) return;
    let cancelled = false;
    setLoadingRows(true);
    getHomeRows(country, PROVIDER_IDS, GENRE_IDS)
      .then((bundle) => {
        if (cancelled) return;
        setAvailablePlatforms(bundle.platforms);
        setPlatformRows(bundle.platformRows);
        setGenreRowsData(bundle.genreRows);
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

  return (
    <AppShell active="Home" onNavigate={goTo}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TopBar title="Explorar" onSearchPress={() => goTo("Search")} />

        {heroItem ? (
          <Hero
            item={heroItem}
            isFavorite={isFavorite(heroItem)}
            onToggleFavorite={() => toggleFavorite(heroItem)}
            onOpenDetail={() => openDetail(heroItem)}
          />
        ) : (
          // Reserva el mismo alto que ocupará el Hero real para que no haya
          // un salto de layout enorme cuando termine de cargar (ver Row.tsx
          // para la misma idea aplicada a las filas de abajo).
          <View style={{ height: isDesktop ? 560 : 420, backgroundColor: colors.surfaceContainer }} />
        )}

        <View
          style={{
            paddingHorizontal: isDesktop ? spacing.marginDesktop : spacing.marginMobile,
            paddingBottom: 48,
          }}
        >
          <Row
            title="Tendencias · Películas"
            items={trendingMovies}
            loading={loadingMovies}
            onItemPress={openDetail}
            onSeeAllPress={() => openCategory("trending-movies")}
          />
          <Row
            title="Tendencias · Series"
            items={trendingSeries}
            loading={loadingSeries}
            onItemPress={openDetail}
            onSeeAllPress={() => openCategory("trending-series")}
          />

          {visiblePlatformRows.map((platform) => (
            <Row
              key={platform.key}
              title={platform.label}
              items={platformRows[platform.providerId] || []}
              loading={loadingRows}
              onItemPress={openDetail}
              onSeeAllPress={() => openCategory(platform.key)}
              emptyLabel={`No encontramos catálogo de ${platform.label} disponible por suscripción en tu región.`}
            />
          ))}

          {GENRE_ROWS.map((genre) => (
            <Row
              key={genre.key}
              title={genre.label}
              items={genreRowsData[genre.genreId] || []}
              loading={loadingRows}
              onItemPress={openDetail}
              onSeeAllPress={() => openCategory(genre.key)}
            />
          ))}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
});
