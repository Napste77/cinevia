import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { getDetail, backdropUrl, posterUrl, profileUrl } from "../api/tmdb";
import { openStreamingLink } from "../api/deepLinks";
import { resolveStreamingLink } from "../api/streamingLinks";
import { getResolvedLiveLinks } from "../api/resolvedStreamingLinks";
import { DetailData } from "../types";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";
import { useFavorites } from "../hooks/useFavorites";
import Chip from "../components/Chip";
import ProviderBadge from "../components/ProviderBadge";
import MediaCard from "../components/MediaCard";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";

export default function DetailScreen({ route, navigation }: any) {
  const { id, mediaType, country } = route.params;
  const { width } = useWindowDimensions();
  const { isDesktop } = useResponsive();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liveLinks, setLiveLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const detail = await getDetail(id, mediaType, country);
        if (!cancelled) setData(detail);
      } catch (e) {
        console.error("Error cargando detalle", e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, mediaType, country]);

  // Independiente de getDetail: resuelve los deep links exactos por
  // plataforma (Wikidata, gratis, + Streaming Availability API opcional).
  // Si ninguna tiene datos, liveLinks queda vacío y resolveStreamingLink
  // cae a overrides/búsqueda igual.
  useEffect(() => {
    let cancelled = false;
    getResolvedLiveLinks(id, mediaType, country)
      .then((links) => {
        if (!cancelled) setLiveLinks(links);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, mediaType, country]);

  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const goTo = (key: RouteKey) => navigation.navigate(key);

  if (loading || !data) {
    return (
      <AppShell active={null} onNavigate={goTo}>
        <View style={styles.loadingContainer}>
          {error ? (
            <Text style={styles.errorText}>No pudimos cargar esta ficha.</Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
          <Pressable style={styles.backFloating} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </AppShell>
    );
  }

  const allProviders = data.providers?.flatrate || [];
  const fav = isFavorite({ id: data.id, media_type: data.media_type });

  return (
    <AppShell active={null} onNavigate={goTo}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.backdropWrap, { height: isDesktop ? 460 : width * 0.65 }]}>
        {backdropUrl(data.backdrop_path) && (
          <Image
            source={{ uri: backdropUrl(data.backdrop_path)! }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient
          colors={["transparent", colors.surface]}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable style={styles.backFloating} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={[styles.body, { paddingHorizontal: hPad }]}>
        <View style={[styles.headerRow, isDesktop && styles.headerRowDesktop]}>
          {isDesktop && posterUrl(data.poster_path) && (
            <Image
              source={{ uri: posterUrl(data.poster_path, "w500")! }}
              style={styles.poster}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.title}</Text>

            <View style={styles.metaRow}>
              {data.year && <Text style={styles.metaText}>{data.year}</Text>}
              {data.runtimeMinutes ? (
                <Text style={styles.metaText}>
                  {" · "}
                  {mediaType === "movie"
                    ? `${Math.floor(data.runtimeMinutes / 60)}h ${data.runtimeMinutes % 60}min`
                    : `${data.runtimeMinutes}min / episodio`}
                </Text>
              ) : null}
              {data.vote_average > 0 && (
                <Text style={styles.metaText}> · ★ {data.vote_average.toFixed(1)}</Text>
              )}
              <Text style={styles.metaText}>
                {" · "}
                {mediaType === "movie" ? "Película" : "Serie"}
              </Text>
            </View>

            <View style={styles.genreRow}>
              {data.genres.map((g) => (
                <Chip key={g.id} label={g.name} variant="outline" style={{ marginRight: 8, marginBottom: 8 }} />
              ))}
            </View>

            <Pressable
              style={[styles.favButton, fav && styles.favButtonActive]}
              onPress={() => toggleFavorite({ ...data, id: data.id, media_type: data.media_type })}
            >
              <MaterialIcons
                name={fav ? "check" : "add"}
                size={18}
                color={fav ? colors.onPrimaryContainer : colors.onSurface}
              />
              <Text style={[styles.favButtonText, fav && { color: colors.onPrimaryContainer }]}>
                {fav ? "En tu lista" : "Agregar a Mi Lista"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Sinopsis</Text>
        <Text style={styles.overview}>{data.overview || "Sin sinopsis disponible."}</Text>

        {data.cast.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Reparto principal</Text>
            <FlatList
              data={data.cast}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item: c }) => (
                <View style={styles.castItem}>
                  {profileUrl(c.profile_path) ? (
                    <Image source={{ uri: profileUrl(c.profile_path)! }} style={styles.castAvatar} />
                  ) : (
                    <View style={[styles.castAvatar, styles.castAvatarPlaceholder]}>
                      <MaterialIcons name="person" size={26} color={colors.onSurfaceVariant} />
                    </View>
                  )}
                  <Text style={styles.castName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.castCharacter} numberOfLines={1}>{c.character}</Text>
                </View>
              )}
            />
          </>
        )}

        {data.trailerKey && (
          <>
            <Text style={styles.sectionLabel}>Tráiler</Text>
            <View style={styles.trailerContainer}>
              {Platform.OS === "web" ? (
                // @ts-ignore - iframe es válido en el DOM web de RN Web
                <iframe
                  style={{ width: "100%", height: "100%", border: 0 }}
                  src={`https://www.youtube.com/embed/${data.trailerKey}`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <WebView
                  style={{ flex: 1 }}
                  javaScriptEnabled
                  source={{ uri: `https://www.youtube.com/embed/${data.trailerKey}` }}
                />
              )}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Disponible en</Text>
        {allProviders.length === 0 ? (
          <Text style={styles.overview}>
            No encontramos plataformas de streaming por suscripción para tu país.
          </Text>
        ) : (
          <View style={styles.providersRow}>
            {allProviders.map((p) => {
              const resolvedUrl = resolveStreamingLink({
                providerName: p.provider_name,
                mediaType: data.media_type,
                tmdbId: data.id,
                title: data.title,
                liveLinks,
              });
              return (
                <ProviderBadge
                  key={p.provider_id}
                  provider={p}
                  url={resolvedUrl}
                  onPress={() => openStreamingLink(resolvedUrl)}
                />
              );
            })}
          </View>
        )}

        {data.recommendations.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recomendaciones similares</Text>
            <FlatList
              data={data.recommendations}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `${item.media_type}-${item.id}`}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <MediaCard
                  item={item}
                  onPress={() =>
                    navigation.push("Detail", {
                      id: item.id,
                      mediaType: item.media_type,
                      country,
                    })
                  }
                />
              )}
            />
          </>
        )}
      </View>
    </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { color: colors.onSurfaceVariant, fontFamily: fonts.body, marginBottom: 12 },
  backdropWrap: { width: "100%", backgroundColor: colors.surfaceContainer },
  backFloating: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(12,19,36,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  body: { marginTop: -80, paddingBottom: 48 },
  headerRow: { marginBottom: 8 },
  headerRowDesktop: { flexDirection: "row", gap: 28, alignItems: "flex-end" },
  poster: { width: 200, height: 300, borderRadius: radii.lg, marginBottom: 8 },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.display,
    fontSize: 30,
    marginBottom: 8,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  metaText: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 14 },
  genreRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  favButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radii.md,
    marginTop: 4,
    marginBottom: 8,
  },
  favButtonActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  favButtonText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 13 },
  sectionLabel: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
    fontSize: 17,
    marginTop: 28,
    marginBottom: 12,
  },
  overview: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  castItem: { width: 96, marginRight: 14 },
  castAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 8 },
  castAvatarPlaceholder: {
    backgroundColor: colors.surfaceContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  castName: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 12 },
  castCharacter: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 11 },
  trailerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainer,
  },
  providersRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
