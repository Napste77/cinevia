import React, { useCallback, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import TopBar from "../components/TopBar";
import RegionPicker from "../components/RegionPicker";
import PlatformPreferences from "../components/PlatformPreferences";
import { useFavorites } from "../hooks/useFavorites";
import { useAuth } from "../context/AuthContext";
import { useRegion } from "../context/RegionContext";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";
import BrandLogo from "../components/BrandLogo";

export default function ProfileScreen({ navigation }: any) {
  const { favorites } = useFavorites();
  const { user, stats, isAuthenticated, isVerified, logout, refreshProfile, resendVerification, deleteAccount } =
    useAuth();
  const { country, setCountry } = useRegion();
  const { isDesktop } = useResponsive();

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onResend = async () => {
    setResendState("sending");
    try {
      await resendVerification();
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      navigation.navigate("Home");
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  // Las stats (películas vistas, calificaciones, etc.) solo se traían una
  // vez al loguearse -- si mirabas una peli y volvías a Perfil en la
  // misma sesión, seguían mostrando los valores viejos. Al entrar a esta
  // pantalla las volvemos a pedir, así siempre reflejan la actividad real.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshProfile().catch(() => {
          // si falla (ej. sin red), se quedan las stats que ya había
        });
      }
    }, [isAuthenticated, refreshProfile])
  );
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;

  const goTo = (key: RouteKey) => navigation.navigate(key);
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <AppShell active="Profile" onNavigate={goTo}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar title="Perfil" onSearchPress={() => goTo("Search")} onHomePress={() => goTo("Home")} />

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

          {isAuthenticated && !isVerified && (
            <View style={styles.verifyBanner}>
              <MaterialIcons name="mark-email-unread" size={22} color={colors.onPrimaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>Verificá tu email</Text>
                <Text style={styles.verifyText}>
                  Te enviamos un link a {user?.email}. Verificá tu cuenta para usar Mi Lista, marcar lo
                  que viste, calificar y comentar.
                </Text>
                <Pressable onPress={onResend} disabled={resendState !== "idle"} hitSlop={6}>
                  <Text style={styles.verifyAction}>
                    {resendState === "sending"
                      ? "Reenviando…"
                      : resendState === "sent"
                      ? "Email reenviado ✓"
                      : "Reenviar email de verificación"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.sectionLabel}>Región</Text>
          <RegionPicker value={country} onChange={setCountry} />
          {!isAuthenticated && (
            <Text style={styles.hint}>Detectada automáticamente — cambiala cuando quieras.</Text>
          )}

          {isAuthenticated && (
            <>
              <Text style={styles.sectionLabel}>Mis plataformas</Text>
              <PlatformPreferences />
            </>
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
              <Text style={styles.sectionLabel}>Cuenta</Text>
              {!confirmingDelete ? (
                <Pressable style={styles.dangerButton} onPress={() => setConfirmingDelete(true)}>
                  <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                  <Text style={styles.dangerText}>Eliminar mi cuenta</Text>
                </Pressable>
              ) : (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>
                    ¿Seguro? Se borran tu cuenta y todos tus datos (Mi Lista, vistos, calificaciones,
                    comentarios). Esta acción no se puede deshacer.
                  </Text>
                  <View style={styles.confirmRow}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => setConfirmingDelete(false)}
                      disabled={deleting}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </Pressable>
                    <Pressable style={styles.dangerConfirmButton} onPress={onDelete} disabled={deleting}>
                      <Text style={styles.dangerConfirmText}>
                        {deleting ? "Eliminando…" : "Sí, eliminar"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}

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
  verifyBanner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.md,
    padding: 14,
    marginTop: 16,
  },
  verifyTitle: { color: colors.onPrimaryContainer, fontFamily: fonts.label, fontSize: 14, marginBottom: 4 },
  verifyText: { color: colors.onPrimaryContainer, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  verifyAction: {
    color: colors.onPrimaryContainer,
    fontFamily: fonts.label,
    fontSize: 13,
    marginTop: 8,
    textDecorationLine: "underline",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  dangerText: { color: colors.error, fontFamily: fonts.label, fontSize: 14 },
  confirmBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.error,
  },
  confirmText: { color: colors.onSurface, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  confirmRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelButton: {
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cancelText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 13 },
  dangerConfirmButton: {
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.error,
  },
  dangerConfirmText: { color: colors.surface, fontFamily: fonts.label, fontSize: 13 },
});
