import React from "react";
import { Text, TextStyle, StyleProp, Pressable } from "react-native";
import { colors } from "../theme";

/**
 * "See" siempre en rgb(183,247,0) = colors.primaryContainer; "Now" hereda
 * el color del texto. Si se pasa `onPress`, el wordmark se vuelve
 * clickeable (lo usamos para volver al Home desde el sidebar/topbar).
 */
export default function BrandLogo({
  style,
  onPress,
}: {
  style?: StyleProp<TextStyle>;
  onPress?: () => void;
}) {
  const label = (
    <Text style={style}>
      Now
      <Text style={{ color: colors.primaryContainer }}>See</Text>
    </Text>
  );

  if (!onPress) return label;
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel="Ir al inicio">
      {label}
    </Pressable>
  );
}
