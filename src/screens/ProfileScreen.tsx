import React from "react";
import { View, Text, Image, Pressable, Switch, StyleSheet, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import TopBar from "../components/TopBar";
import RegionPicker from "../components/RegionPicker";
import { useFavorites } from "../hooks/useFavorites";
import { useAuth } from "../context/AuthContext";
import { useRegion } from "../context/RegionContext";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";
import InstallAppButton from "../components/InstallAppButton";
import BrandLogo from "../components/BrandLogo";

export default function ProfileScreen({ navigation }: any) {
  const { favorites } = useFavorites();
  const { user, stats, isAuthenticated, logout, updateProfile } = useAuth();
  const { country, setCountry } = useRegion();
  const { isDesktop } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <AppShell active="Profile" onNavigate={goTo}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar title="Perfil" onSearchPress={() => goTo("Search")} />

        <View style={{ paddingHorizontal: hPad, paddingTop: 24, paddingBottom: 48 }}>
          <View style={styles.card}>
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : isAuthenticated ? (
                <Text style={styles.avatarInitial}>{initial}</Text>
              ) : (
                <MaterialIcons name="person" size={32} color={colors.onSurfaceVariant} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name || (isAuthenticated ? user?.email : "Invitado")}</Text>
              {isAuthenticated && <Text style={styles.sub}>{user?.email}</Text>}
            </View>
            {isAuthenticated ? (
              <Pressable style={styles.logoutButton} onPress={logout} hitSlop={8}>
                <MaterialIcons name="logout" size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            ) : (
              <Pressable style={styles.loginButton} onPress={() => navigation.navigate("Auth")}>
                <Text style={styles.loginButtonText}>Iniciar sesión</Text>
              </Pressable>
            )}
          </View>

          {!isAuthenticated && (
            <Text style={styles.guestHint}>
              Buscá, navegá el catálogo y mirá fichas sin cuenta. Creá una para calificar, comentar,
              guardar Mi Lista sincronizada entre tus dispositivos y personalizar tu región.
            </Text>
          )}

          <Text style={styles.sectionLabel}>Región</Text>
          <RegionPicker value={country} onChange={setCountry} />
          {!isAuthenticated && (
            <Text style={styles.hint}>Detectada automáticamente — cambiala cuando quieras.</Text>
          )}

          <View style={styles.statsRow}>
            <StatCard value={favorites.length} label="En Mi Lista" />
            {isAuthenticated && stats && (
              <>
                <StatCard value={stats.moviesViewed} label="Películas vistas" />
                <StatCard value={stats.tvViewed} label="Series vistas" />
                <StatCard value={stats.ratingsCount} label="Calificaciones" />
                <StatCard value={stats.commentsCount} label="Comentarios" />
              </>
            )}
          </View>

          {isAuthenticated && (
            <>
              <Text style={styles.sectionLabel}>Notificaciones</Text>
              <Text style={styles.hint}>Preparado para futuras versiones — todavía no se envía nada.</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Nuevos estrenos</Text>
                <Switch
                  value={user?.notifyNewReleases ?? true}
                  onValueChange={(v) => updateProfile({ notifyNewReleases: v })}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Respuestas a comentarios</Text>
                <Switch
                  value={user?.notifyComments ?? true}
                  onValueChange={(v) => updateProfile({ notifyComments: v })}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Instalar la app</Text>
          <InstallAppButton />

          <Text style={styles.sectionLabel}>
            Acerca de <BrandLogo />
          </Text>
          <Text style={styles.about}>
            NowSee te ayuda a descubrir qué ver: tendencias globales, catálogos por plataforma y por
            género, calificaciones y comentarios de la comunidad, todo actualizado automáticamente.
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
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
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarInitial: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 22 },
  name: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 18 },
  sub: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  loginButton: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loginButtonText: { color: colors.onPrimaryContainer, fontFamily: fonts.label, fontSize: 13 },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  guestHint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  hint: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  statCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    minWidth: 120,
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  toggleLabel: { color: colors.onSurface, fontFamily: fonts.body, fontSize: 14 },
  about: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
});
