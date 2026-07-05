import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import {
  getTrendingByCountry,
  getByPlatform,
  getByGenre,
} from "../api/tmdb";
import { TrendingItem } from "../types";
import { DEFAULT_COUNTRY, STREAMING_PLATFORMS, GENRE_ROWS } from "../config/catalog";
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
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTrending(true);
      try {
        const [movies, series] = await Promise.all([
          getTrendingByCountry(country, "movie"),
          getTrendingByCountry(country, "tv"),
        ]);
        if (cancelled) return;
        setTrendingMovies(movies);
        setTrendingSeries(series);
      } catch (e) {
        console.error("Error cargando tendencias", e);
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRows(true);
      try {
        const [platformResults, genreResults] = await Promise.all([
          Promise.allSettled(
            STREAMING_PLATFORMS.map((p) => getByPlatform(country, p.providerId, "movie"))
          ),
          Promise.allSettled(
            GENRE_ROWS.map((g) => getByGenre(country, g.genreId, "movie"))
          ),
        ]);
        if (cancelled) return;

        const nextPlatformRows: Record<string, TrendingItem[]> = {};
        platformResults.forEach((result, i) => {
          nextPlatformRows[STREAMING_PLATFORMS[i].key] =
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
  }, [country]);

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

  return (
    <AppShell active="Home" onNavigate={goTo}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TopBar title="Explorar" onSearchPress={() => goTo("Search")} />

        {heroItem && (
          <Hero
            item={heroItem}
            isFavorite={isFavorite(heroItem)}
            onToggleFavorite={() => toggleFavorite(heroItem)}
            onOpenDetail={() => openDetail(heroItem)}
          />
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
            loading={loadingTrending}
            onItemPress={openDetail}
          />
          <Row
            title="Tendencias · Series"
            items={trendingSeries}
            loading={loadingTrending}
            onItemPress={openDetail}
          />

          {STREAMING_PLATFORMS.map((platform) => (
            <Row
              key={platform.key}
              title={platform.label}
              items={platformRows[platform.key] || []}
              loading={loadingRows}
              onItemPress={openDetail}
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
