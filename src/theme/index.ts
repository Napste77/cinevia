import { Platform, TextStyle, ViewStyle } from "react-native";

/**
 * Design tokens extraídos de stitch_neo_cinema_catalog/cinematic_neo_noir/DESIGN.md
 * ("Cinematic Neo-Noir" design system).
 */
export const colors = {
  surface: "#0c1324",
  surfaceDim: "#0c1324",
  surfaceBright: "#33394c",
  surfaceContainerLowest: "#070d1f",
  surfaceContainerLow: "#151b2d",
  surfaceContainer: "#191f31",
  surfaceContainerHigh: "#23293c",
  surfaceContainerHighest: "#2e3447",
  surfaceVariant: "#2e3447",
  onSurface: "#dce1fb",
  onSurfaceVariant: "#9aa2c3",
  outline: "#434933",
  primary: "#a0d800", // Cyber Lime
  onPrimary: "#141f00",
  primaryContainer: "#b7f700",
  onPrimaryContainer: "#141f00",
  secondary: "#8b5cf6", // Electric Violet
  onSecondary: "#ffffff",
  secondaryContainer: "#571bc1",
  onSecondaryContainer: "#e9ddff",
  error: "#ffb4ab",
  background: "#020617",
  white: "#ffffff",
  black: "#000000",
} as const;

export const fonts = {
  display: "Sora_700Bold",
  headline: "Sora_600SemiBold",
  label: "Sora_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
} as const;

export const typography: Record<string, TextStyle> = {
  displayXl: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1.2,
    color: colors.onSurface,
  },
  displayLg: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: colors.onSurface,
  },
  headlineLg: {
    fontFamily: fonts.headline,
    fontSize: 28,
    lineHeight: 36,
    color: colors.onSurface,
  },
  headlineMobile: {
    fontFamily: fonts.headline,
    fontSize: 22,
    lineHeight: 30,
    color: colors.onSurface,
  },
  bodyLg: {
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurfaceVariant,
  },
  bodyMd: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  labelMd: {
    fontFamily: fonts.label,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    color: colors.onSurface,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
};

export const spacing = {
  unit: 8,
  gutter: 20,
  marginMobile: 16,
  marginDesktop: 56,
  containerMax: 1440,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/** backdrop-filter solo tiene efecto real en web; en nativo se ignora sin romper nada. */
export function glass(opacity = 0.6): ViewStyle {
  return {
    backgroundColor: `rgba(15, 23, 42, ${opacity})`,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...(Platform.OS === "web"
      ? ({ backdropFilter: "blur(20px)" } as any)
      : null),
  };
}

export const breakpoints = {
  mobile: 640,
  tablet: 1024,
};
