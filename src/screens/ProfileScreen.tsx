import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import TopBar from "../components/TopBar";
import { useFavorites } from "../hooks/useFavorites";
import { DEFAULT_COUNTRY } from "../config/catalog";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function ProfileScreen({ navigation }: any) {
  const { favorites } = useFavorites();
  const { isDesktop } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;

  const goTo = (key: RouteKey) => navigation.navigate(key);

  return (
    <AppShell active="Profile" onNavigate={goTo}>
      <View style={styles.container}>
        <TopBar title="Perfil" onSearchPress={() => goTo("Search")} />

        <View style={{ paddingHorizontal: hPad, paddingTop: 24 }}>
          <View style={styles.card}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={32} color={colors.onSurfaceVariant} />
            </View>
            <View>
              <Text style={styles.name}>Invitado</Text>
              <Text style={styles.sub}>Región: {DEFAULT_COUNTRY}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{favorites.length}</Text>
              <Text style={styles.statLabel}>En Mi Lista</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Acerca de Cinevia</Text>
          <Text style={styles.about}>
            Cinevia te ayuda a descubrir qué ver: tendencias globales, catálogos
            por plataforma y por género, todo actualizado con datos de TMDB.
            Esta es una versión MVP sin cuentas de usuario — tu lista se guarda
            solo en este dispositivo.
          </Text>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 18 },
  sub: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statValue: { color: colors.primary, fontFamily: fonts.display, fontSize: 24 },
  statLabel: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  sectionLabel: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
    fontSize: 17,
    marginTop: 32,
    marginBottom: 10,
  },
  about: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
});
