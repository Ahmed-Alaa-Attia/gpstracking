export const colors = {
  // Surface foundation
  surface: "#1a1a1a",
  surfaceDim: "#0d0d0d",
  surfaceBright: "#2a2a2a",
  surfaceContainerLowest: "#000000",
  surfaceContainerLow: "#141414",
  surfaceContainer: "#1a1a1a",
  surfaceContainerHigh: "#2a2a2a",
  surfaceContainerHighest: "#333333",
  surfaceVariant: "#2a2a2a",
  surfaceTint: "#b9f600",

  background: "#0d0d0d",
  onBackground: "#ffffff",

  // Primary
  primary: "#b9f600",
  onPrimary: "#263500",
  primaryContainer: "#b9f600",
  onPrimaryContainer: "#516e00",
  inversePrimary: "#4c6700",
  primaryFixed: "#b9f600",

  // Secondary
  secondary: "#c6c6c7",
  onSecondary: "#2f3131",
  secondaryContainer: "#454747",
  onSecondaryContainer: "#b4b5b5",

  // Tertiary
  tertiary: "#ffffff",
  onTertiary: "#243240",
  tertiaryContainer: "#d5e4f7",
  onTertiaryContainer: "#576676",

  // Content
  onSurface: "#ffffff",
  onSurfaceVariant: "#a3a3a3",
  outline: "#444444",
  outlineVariant: "#2a2a2a",
  inverseSurface: "#ffffff",
  inverseOnSurface: "#0d0d0d",

  // Error
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const typography = {
  displayLg: { fontFamily: "Space Grotesk", fontSize: 64, fontWeight: "700" as const, letterSpacing: -0.04 },
  headlineSm: { fontFamily: "Space Grotesk", fontSize: 24, fontWeight: "600" as const },
  bodyMd: { fontFamily: "Lexend", fontSize: 16, fontWeight: "400" as const },
  labelMd: {
    fontFamily: "Lexend",
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.1,
    textTransform: "uppercase" as const,
  },
} as const;

export const glow = {
  primary: {
    shadowColor: colors.surfaceTint,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

export const theme = { colors, radii, spacing, typography, glow };
export type Theme = typeof theme;
