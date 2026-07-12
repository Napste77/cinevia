import React from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import { colors } from "../theme";

/** "See" siempre en rgb(183,247,0) = colors.primaryContainer; "Now" hereda el color del texto. */
export default function BrandLogo({ style }: { style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      Now
      <Text style={{ color: colors.primaryContainer }}>See</Text>
    </Text>
  );
}
