import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import {
  getTrendingByCountry,
  getByPlatform,
  getByGenre,
} from "../api/tmdb";
import { TrendingItem } from "../types";
import { DEFAULT_COUNTRY, HOME_PLATFORM_ROWS, GENRE_ROWS } from "../config/catalog";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import Hero from "../components/Hero";
import Row from "../components/Row";
import TopBar from "../components/TopBar";
import { useFavorites } from "../hooks/useFavorites";
import { colors, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function HomeScreen({ navigation }: any) {
  const country = DEFAULT_COUNTRY;
  const { isDesktop } = useResponsive();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [trendingMovies, setTrendingMovies] = useState<TrendingItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<TrendingItem[]>([]);
  const [platformRows, setPlatformRows] = useState<Record<string, TrendingItem[]>>({});
  const [genreRowsData, setGenreRowsData] = useState<Record<string, TrendingItem[]>>({});
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);

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

  // Las filas de plataforma/género (14 requests) se disparan recién
  // cuando ya resolvió la de películas: así no compiten por las conexiones
  // concurrentes del navegador con el contenido crítico de arriba (Hero +
  // primera fila), que es lo que de verdad define el LCP percibido.
  useEffect(() => {
    if (loadingMovies) return;
    let cancelled = false;
    (async () => {
      setLoadingRows(true);
      try {
        const [platformResults, genreResults] = await Promise.all([
          Promise.allSettled(
            HOME_PLATFORM_ROWS.map((p) => getByPlatform(country, p.providerId, "movie"))
          ),
          Promise.allSettled(
            GENRE_ROWS.map((g) => getByGenre(country, g.genreId, "movie"))
          ),
        ]);
        if (cancelled) return;

        const nextPlatformRows: Record<string, TrendingItem[]> = {};
        platformResults.forEach((result, i) => {
          nextPlatformRows[HOME_PLATFORM_ROWS[i].key] =
            result.status === "fulfilled" ? result.value : [];
        });
        setPlatformRows(nextPlatformRows);

        const nextGenreRows: Record<string, TrendingItem[]> = {};
        genreResults.forEach((result, i) => {
          nextGenreRows[GENRE_ROWS[i].key] =
            result.status === "fulfilled" ? result.value : [];
        });
        setGenreRowsData(nextGenreRows);
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    })();
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

          {HOME_PLATFORM_ROWS.map((platform) => (
            <Row
              key={platform.key}
              title={platform.label}
              items={platformRows[platform.key] || []}
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
              items={genreRowsData[genre.key] || []}
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
