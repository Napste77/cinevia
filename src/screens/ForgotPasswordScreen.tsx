import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import { forgotPassword } from "../api/auth";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function ForgotPasswordScreen({ navigation }: any) {
  const { isDesktop } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const goTo = (key: RouteKey) => navigation.navigate(key);

  const submit = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Algo salió mal. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active={null} onNavigate={goTo}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingHorizontal: hPad }]}>
          <Pressable style={styles.backButton} onPress={() => navigation.navigate("Auth")} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Recuperar contraseña</Text>
        </View>

        <View style={[styles.form, { paddingHorizontal: hPad }]}>
          {sent ? (
            <>
              <View style={styles.successIcon}>
                <MaterialIcons name="mark-email-read" size={28} color={colors.onPrimaryContainer} />
              </View>
              <Text style={styles.successTitle}>Revisá tu email</Text>
              <Text style={styles.hint}>
                Si <Text style={{ color: colors.onSurface }}>{email.trim()}</Text> está registrado en NowSee, te
                enviamos un link para elegir una nueva contraseña. Puede tardar unos minutos en llegar.
              </Text>
              <Pressable style={styles.submitButton} onPress={() => navigation.navigate("Auth")}>
                <Text style={styles.submitText}>Volver a iniciar sesión</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Ingresá el email con el que te registraste y te mandamos un link para elegir una contraseña nueva.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.onSurfaceVariant}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable style={styles.submitButton} onPress={submit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.onPrimaryContainer} />
                ) : (
                  <Text style={styles.submitText}>Enviar link</Text>
                )}
              </Pressable>

              <Pressable style={styles.switchModeButton} onPress={() => navigation.navigate("Auth")}>
                <Text style={styles.switchModeText}>Volver a iniciar sesión</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 24 },
  form: { maxWidth: 420, width: "100%", paddingBottom: 48 },
  hint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: 12,
  },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 13, marginBottom: 12 },
  submitButton: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: colors.onPrimaryContainer, fontFamily: fonts.label, fontSize: 15 },
  switchModeButton: { marginTop: 16, alignItems: "center" },
  switchModeText: { color: colors.primary, fontFamily: fonts.label, fontSize: 13 },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 18, marginBottom: 8 },
});
