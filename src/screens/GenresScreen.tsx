import React from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import TopBar from "../components/TopBar";
import { GENRE_ROWS } from "../config/catalog";
import { useResponsive } from "../hooks/useResponsive";
import { colors, fonts, radii, spacing } from "../theme";

// Ícono por género (MaterialIcons) — puramente decorativo.
const GENRE_ICONS: Record<string, string> = {
  action: "local-fire-department",
  scifi: "rocket-launch",
  comedy: "sentiment-very-satisfied",
  horror: "dark-mode",
  drama: "theater-comedy",
  animation: "animation",
  documentary: "menu-book",
};

export default function GenresScreen({ navigation }: any) {
  const { isDesktop, columns, width } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const gutter = 14;
  // En géneros usamos tarjetas más anchas que en las grillas de pósters:
  // como mucho 3 columnas en desktop, 2 en mobile.
  const cols = Math.min(columns, isDesktop ? 3 : 2);
  const cardWidth = (width - hPad * 2 - gutter * (cols - 1)) / cols;

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const openGenre = (slug: string) => navigation.navigate("Category", { slug });

  return (
    <AppShell active="Genres" onNavigate={goTo}>
      <View style={styles.container}>
        <TopBar title="Géneros" onSearchPress={() => goTo("Search")} onHomePress={() => goTo("Home")} />
        <FlatList
          style={{ flex: 1 }}
          key={cols}
          data={GENRE_ROWS}
          numColumns={cols}
          keyExtractor={(g) => g.key}
          contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: 20, paddingBottom: 48 }}
          columnWrapperStyle={cols > 1 ? { gap: gutter } : undefined}
          ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { width: cardWidth }]}
              onPress={() => openGenre(item.key)}
            >
              <MaterialIcons
                name={(GENRE_ICONS[item.key] || "movie") as any}
                size={26}
                color={colors.primary}
              />
              <Text style={styles.cardLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          )}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardLabel: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.headline,
    fontSize: 16,
  },
});
