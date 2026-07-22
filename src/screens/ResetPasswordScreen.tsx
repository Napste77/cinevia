import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import { resetPassword } from "../api/auth";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function ResetPasswordScreen({ navigation, route }: any) {
  const { isDesktop } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;
  const token: string | undefined = route?.params?.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const goTo = (key: RouteKey) => navigation.navigate(key);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token!, password);
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || "El link es inválido o venció. Pedí uno nuevo.");
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
          <Text style={styles.title}>Nueva contraseña</Text>
        </View>

        <View style={[styles.form, { paddingHorizontal: hPad }]}>
          {!token ? (
            <>
              <Text style={styles.hint}>
                Este link no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?" en la pantalla de inicio de
                sesión.
              </Text>
              <Pressable style={styles.submitButton} onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.submitText}>Pedir un link nuevo</Text>
              </Pressable>
            </>
          ) : done ? (
            <>
              <View style={styles.successIcon}>
                <MaterialIcons name="check" size={28} color={colors.onPrimaryContainer} />
              </View>
              <Text style={styles.successTitle}>Contraseña actualizada</Text>
              <Text style={styles.hint}>Ya podés iniciar sesión con tu nueva contraseña.</Text>
              <Pressable style={styles.submitButton} onPress={() => navigation.navigate("Auth")}>
                <Text style={styles.submitText}>Iniciar sesión</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>Elegí una contraseña nueva para tu cuenta.</Text>
              <TextInput
                style={styles.input}
                placeholder="Contraseña nueva"
                placeholderTextColor={colors.onSurfaceVariant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Repetir contraseña"
                placeholderTextColor={colors.onSurfaceVariant}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable style={styles.submitButton} onPress={submit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.onPrimaryContainer} />
                ) : (
                  <Text style={styles.submitText}>Guardar contraseña</Text>
                )}
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
