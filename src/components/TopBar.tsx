import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { colors, fonts, spacing } from "../theme";
import { useResponsive } from "../hooks/useResponsive";

export default function TopBar({
  onSearchPress,
  title,
}: {
  onSearchPress: () => void;
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
        <Text style={styles.brand}>NowSee</Text>
      )}
      <Pressable style={styles.searchButton} onPress={onSearchPress}>
        <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
      </Pressable>
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
  },
  brand: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 20 },
  title: { color: colors.onSurface, fontFamily: fonts.headline, fontSize: 22 },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
});
