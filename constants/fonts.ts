/**
 * Space Grotesk files in `assets/Fonts`. Keys must match `useFonts` / `fontFamily` strings.
 */
export const spaceGroteskFontMap = {
  "SpaceGrotesk-Light": require("@/assets/Fonts/SpaceGrotesk-Light.ttf"),
  "SpaceGrotesk-Regular": require("@/assets/Fonts/SpaceGrotesk-Regular.ttf"),
  "SpaceGrotesk-Medium": require("@/assets/Fonts/SpaceGrotesk-Medium.ttf"),
  "SpaceGrotesk-SemiBold": require("@/assets/Fonts/SpaceGrotesk-SemiBold.ttf"),
  "SpaceGrotesk-Bold": require("@/assets/Fonts/SpaceGrotesk-Bold.ttf"),
} as const;

/** Use with `fontFamily` in styles (each weight is a separate loaded face on native). */
export const fontFamily = {
  light: "SpaceGrotesk-Light",
  regular: "SpaceGrotesk-Regular",
  medium: "SpaceGrotesk-Medium",
  semibold: "SpaceGrotesk-SemiBold",
  bold: "SpaceGrotesk-Bold",
} as const;
