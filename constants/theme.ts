export const colors = {
  // Surface foundation
  surface: "#10141a",
  surfaceDim: "#0a0e14",
  surfaceContainerLowest: "#0a0e14",
  surfaceContainerLow: "#181c22",
  surfaceContainer: "#1d2127",
  surfaceContainerHigh: "#262a31",
  surfaceContainerHighest: "#31353c",
  surfaceVariant: "#31353c",
  surfaceTint: "#4ce346",

  // Signal (primary)
  primary: "#55ea4d",
  primaryContainer: "#32cd32",
  primaryFixed: "#75ff68",
  onPrimary: "#003a03",

  // Warning (tertiary)
  tertiary: "#ffbcc7",
  tertiaryContainer: "#ff92a8",

  // Content
  onSurface: "#dfe2eb",
  onSurfaceVariant: "#a8afbd",
  outlineVariant: "#3d4a39",
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
  displayLg: { fontSize: 56, fontWeight: "700" as const, letterSpacing: -1 },
  headlineSm: { fontSize: 24, fontWeight: "600" as const },
  bodyMd: { fontSize: 14, fontWeight: "400" as const },
  labelMd: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.8,
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
