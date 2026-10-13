import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV_ITEMS, RouteKey } from "./NavItems";
import { colors, fonts } from "../theme";

export default function BottomNav({
  active,
  onNavigate,
}: {
  active: RouteKey | null;
  onNavigate: (key: RouteKey) => void;
}) {
  // En nativo el gesto/barra de inicio ocupa la franja de abajo: sumamos el
  // inset para que los íconos no queden tapados. En web insets.bottom = 0.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 68 + insets.bottom, paddingBottom: insets.bottom }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => onNavigate(item.key)}
            style={styles.item}
          >
            <MaterialIcons
              name={item.icon as any}
              size={22}
              color={isActive ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 68,
    backgroundColor: "rgba(12,19,36,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  item: { alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10 },
  label: { color: colors.onSurfaceVariant, fontFamily: fonts.label, fontSize: 10 },
  labelActive: { color: colors.primary },
});
