import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { colors, fonts, radii } from "../theme";

export default function InstallAppButton() {
  const { canInstall, isIos, installed, promptInstall, showManualFallback } = useInstallPrompt();

  if (Platform.OS !== "web") return null;

  if (installed) {
    return (
      <View style={styles.installedRow}>
        <MaterialIcons name="check-circle" size={18} color={colors.primary} />
        <Text style={styles.installedText}>NowSee ya está instalada en este dispositivo</Text>
      </View>
    );
  }

  if (canInstall) {
    return (
      <Pressable style={styles.button} onPress={promptInstall}>
        <MaterialIcons name="install-mobile" size={20} color={colors.onPrimaryContainer} />
        <Text style={styles.buttonText}>Instalar aplicación</Text>
      </Pressable>
    );
  }

  if (isIos) {
    return (
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Instalar en iPhone/iPad</Text>
        <Text style={styles.hintText}>
          Tocá el botón Compartir <Text style={styles.bold}>􀈂</Text> en Safari y elegí
          "Agregar a pantalla de inicio".
        </Text>
      </View>
    );
  }

  if (showManualFallback) {
    return (
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Instalar manualmente</Text>
        <Text style={styles.hintText}>
          Tu navegador no ofreció el instalador automático. Abrí el menú{" "}
          <Text style={styles.bold}>⋮</Text> (arriba a la derecha) y elegí "Instalar aplicación"
          o "Añadir a pantalla de inicio".
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: radii.md,
  },
  buttonText: { color: colors.onPrimaryContainer, fontFamily: fonts.label, fontSize: 14 },
  installedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  installedText: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 13 },
  hintBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  hintTitle: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 13, marginBottom: 4 },
  hintText: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  bold: { fontFamily: fonts.bodySemiBold },
});
