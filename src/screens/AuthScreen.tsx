import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AppShell from "../navigation/AppShell";
import { RouteKey } from "../navigation/NavItems";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radii, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function AuthScreen({ navigation }: any) {
  const { login, register } = useAuth();
  const { isDesktop } = useResponsive();
  const hPad = isDesktop ? spacing.marginDesktop : spacing.marginMobile;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (key: RouteKey) => navigation.navigate(key);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Completá email y contraseña.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim() || undefined);
      }
      navigation.navigate("Profile");
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
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</Text>
        </View>

        <View style={[styles.form, { paddingHorizontal: hPad }]}>
          {mode === "register" && (
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={colors.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.onSurfaceVariant}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colors.onSurfaceVariant}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.submitButton} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryContainer} />
            ) : (
              <Text style={styles.submitText}>{mode === "login" ? "Entrar" : "Crear cuenta"}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchModeButton}
            onPress={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            <Text style={styles.switchModeText}>
              {mode === "login" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Iniciá sesión"}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.socialHint}>Google y Apple estarán disponibles próximamente.</Text>
          <View style={styles.socialRow}>
            <View style={[styles.socialButton, styles.socialButtonDisabled]}>
              <MaterialIcons name="g-translate" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.socialButtonText}>Google</Text>
            </View>
            <View style={[styles.socialButton, styles.socialButtonDisabled]}>
              <MaterialIcons name="apple" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </View>
          </View>
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
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 24,
  },
  socialHint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  socialRow: { flexDirection: "row", gap: 12 },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  socialButtonDisabled: { opacity: 0.5 },
  socialButtonText: { color: colors.onSurfaceVariant, fontFamily: fonts.label, fontSize: 13 },
});
