import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, radii, fonts } from "../theme";

/** Chip tocable para filtros (plataforma/año/orden) — Chip.tsx es solo presentacional. */
export default function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  label: { color: colors.onSurfaceVariant, fontFamily: fonts.label, fontSize: 12 },
  labelActive: { color: colors.onPrimaryContainer },
});
