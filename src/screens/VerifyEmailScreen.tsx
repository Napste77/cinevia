import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import { verifyEmail } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

type Status = "verifying" | "ok" | "error" | "notoken";

export default function VerifyEmailScreen({ navigation, route }: any) {
  const { isDesktop } = useResponsive();
  const { isAuthenticated, refreshProfile } = useAuth();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const token: string | undefined = route?.params?.token;

  const [status, setStatus] = useState<Status>(token ? "verifying" : "notoken");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ran = useRef(false);

  const goTo = (key: RouteKey) => navigation.navigate(key);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await verifyEmail(token);
        setStatus("ok");
        // Si el usuario ya está logueado, refrescamos su perfil para que
        // emailVerified pase a true al instante (habilita las acciones).
        if (isAuthenticated) {
          refreshProfile().catch(() => {});
        }
      } catch (e: any) {
        setErrorMsg(e?.response?.data?.error || "El link de verificación es inválido o venció.");
        setStatus("error");
      }
    })();
  }, [token, isAuthenticated, refreshProfile]);

  return (
    <AppShell active={null} onNavigate={goTo}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.form, { paddingHorizontal: hPad }]}>
          {status === "verifying" && (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.hint}>Verificando tu email…</Text>
            </>
          )}

          {status === "ok" && (
            <>
              <View style={styles.successIcon}>
                <MaterialIcons name="check" size={28} color={colors.onPrimaryContainer} />
              </View>
              <Text style={styles.title}>¡Email verificado!</Text>
              <Text style={styles.hint}>
                Listo, ya podés usar todas las funciones de tu cuenta: Mi Lista, marcar lo que
                viste, calificar y comentar.
              </Text>
              <Pressable style={styles.button} onPress={() => navigation.navigate("Home")}>
                <Text style={styles.buttonText}>Ir al inicio</Text>
              </Pressable>
            </>
          )}

          {(status === "error" || status === "notoken") && (
            <>
              <View style={styles.errorIcon}>
                <MaterialIcons name="error-outline" size={28} color={colors.onSurface} />
              </View>
              <Text style={styles.title}>No pudimos verificar</Text>
              <Text style={styles.hint}>
                {status === "notoken"
                  ? "Este link no es válido. Entrá a tu perfil y pedí que te reenviemos el email de verificación."
                  : errorMsg}
              </Text>
              <Pressable
                style={styles.button}
                onPress={() => navigation.navigate(isAuthenticated ? "Profile" : "Auth")}
              >
                <Text style={styles.buttonText}>
                  {isAuthenticated ? "Ir a mi perfil" : "Iniciar sesión"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
  form: {
    maxWidth: 420,
    width: "100%",
    alignItems: "center",
    alignSelf: "center",
    paddingTop: 80,
    paddingBottom: 48,
    gap: 12,
  },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 24, textAlign: "center" },
  hint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: colors.onPrimaryContainer, fontFamily: fonts.label, fontSize: 15 },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: "center",
    alignItems: "center",
  },
});
