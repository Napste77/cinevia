import React from "react";
import { View, TextInput, StyleSheet, ViewStyle } from "react-native";
import { colors, radii, fonts } from "../theme";

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar películas, series...",
  style,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        style={[styles.input, { outlineStyle: "none" } as any]}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(46,52,71,0.35)",
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  input: {
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
