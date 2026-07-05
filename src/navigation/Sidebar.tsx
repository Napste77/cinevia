import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NAV_ITEMS, RouteKey } from "./NavItems";
import { colors, fonts, radii } from "../theme";

export default function Sidebar({
  active,
  onNavigate,
}: {
  active: RouteKey | null;
  onNavigate: (key: RouteKey) => void;
}) {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>Cinevia</Text>
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onNavigate(item.key)}
              style={[styles.item, isActive && styles.itemActive]}
            >
              <MaterialIcons
                name={item.icon as any}
                size={22}
                color={isActive ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: "100%",
    paddingTop: 32,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
  },
  brand: {
    color: colors.onSurface,
    fontFamily: fonts.display,
    fontSize: 26,
    marginBottom: 40,
    marginLeft: 8,
  },
  nav: { gap: 4 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  itemActive: { backgroundColor: colors.primaryContainer },
  label: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.label,
    fontSize: 14,
  },
  labelActive: { color: colors.onPrimaryContainer },
});
