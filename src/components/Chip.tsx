import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, radii, fonts } from "../theme";

export default function Chip({
  label,
  variant = "default",
  style,
}: {
  label: string;
  variant?: "default" | "outline";
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.chip,
        variant === "outline" ? styles.outline : styles.filled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "outline" ? styles.labelOutline : styles.labelFilled,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  filled: { backgroundColor: colors.surfaceContainerHigh },
  outline: {
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    backgroundColor: "transparent",
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  labelFilled: { color: "#c4b5fd" },
  labelOutline: { color: colors.onSurfaceVariant },
});
