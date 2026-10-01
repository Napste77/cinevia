import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { colors, fonts, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";
import BrandLogo from "./BrandLogo";
import UserMenu from "./UserMenu";

export default function TopBar({
  onSearchPress,
  onHomePress,
  title,
}: {
  onSearchPress: () => void;
  onHomePress?: () => void;
  title?: string;
}) {
  const { isDesktop } = useResponsive();

  return (
    <View
      style={[
        styles.wrap,
        { paddingHorizontal: isDesktop ? spacing.marginDesktop : spacing.marginMobile },
      ]}
    >
      {isDesktop ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <BrandLogo style={styles.brand} onPress={onHomePress} />
      )}
      <View style={styles.actions}>
        <Pressable style={styles.searchButton} onPress={onSearchPress}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
        </Pressable>
        <UserMenu />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    backgroundColor: "rgba(12,19,36,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    // Establece un contexto de apilado por encima del contenido que sigue
    // (Hero, filas), para que el desplegable del UserMenu no quede tapado.
    position: "relative",
    zIndex: 1000,
  },
  brand: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 20 },
  title: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 22 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
});
