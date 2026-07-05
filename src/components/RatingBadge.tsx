import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii, fonts } from "../theme";

export default function RatingBadge({ value }: { value: number }) {
  if (!value) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.value}>{value.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(25,31,49,0.85)",
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  star: { color: colors.primary, fontSize: 11 },
  value: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 12 },
});
