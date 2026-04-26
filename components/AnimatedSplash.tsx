import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface AnimatedSplashProps {
  onAnimationComplete?: () => void;
  backgroundColor?: string;
  primaryColor?: string;
}

const LOGO_SIZE = 140;
const WORDMARK = 'TRACKOO';

export function AnimatedSplash({
  onAnimationComplete,
  backgroundColor = '#10141a',
  primaryColor = '#55ea4d',
}: AnimatedSplashProps) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const wrapperOpacity = useSharedValue(1);
  const wrapperScale = useSharedValue(1);

  // Grid lines (4 horizontal, 4 vertical) fade in staggered
  const gridProgress = useSharedValue(0);

  // 3 staggered radar pulses
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  // Logo
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.4);
  const logoGlow = useSharedValue(0);

  // Status text
  const statusOpacity = useSharedValue(0);
  const lockedOpacity = useSharedValue(0);

  // Wordmark letters (each animates in sequence)
  const letterProgress = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  const lightHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  const mediumHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  }, []);

  const finishAnimation = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (reduceMotion) {
      logoOpacity.value = 1;
      logoScale.value = 1;
      letterProgress.value = WORDMARK.length;
      subtitleOpacity.value = 1;
      wrapperOpacity.value = withDelay(
        500,
        withTiming(0, { duration: 300 }, (f) => {
          if (f) runOnJS(finishAnimation)();
        }),
      );
      return;
    }

    // Phase 1: Grid awakening (0-450ms)
    gridProgress.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
    statusOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));

    // Phase 2: Radar pulses cascade (300-1500ms)
    pulse1.value = withDelay(300, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    pulse2.value = withDelay(500, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    pulse3.value = withDelay(700, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));

    // Phase 3: Logo lock-on (650-1100ms)
    logoOpacity.value = withDelay(650, withTiming(1, { duration: 350 }));
    logoScale.value = withDelay(
      650,
      withSpring(1, { damping: 9, stiffness: 160 }, (f) => {
        if (f) runOnJS(lightHaptic)();
      }),
    );
    logoGlow.value = withDelay(
      900,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
      ),
    );

    // Phase 4: Wordmark + status (1200-1900ms)
    letterProgress.value = withDelay(
      1200,
      withTiming(WORDMARK.length, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      }),
    );
    subtitleOpacity.value = withDelay(
      1500,
      withTiming(1, { duration: 400 }),
    );
    lockedOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 300 }, (f) => {
        if (f) runOnJS(mediumHaptic)();
      }),
    );

    // Phase 5: Hand-off (2200-2600ms)
    wrapperScale.value = withDelay(
      2200,
      withTiming(1.08, { duration: 400, easing: Easing.in(Easing.cubic) }),
    );
    wrapperOpacity.value = withDelay(
      2200,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, (f) => {
        if (f) runOnJS(finishAnimation)();
      }),
    );
  }, [
    reduceMotion,
    gridProgress,
    pulse1,
    pulse2,
    pulse3,
    logoOpacity,
    logoScale,
    logoGlow,
    statusOpacity,
    lockedOpacity,
    letterProgress,
    subtitleOpacity,
    wrapperOpacity,
    wrapperScale,
    lightHaptic,
    mediumHaptic,
    finishAnimation,
  ]);

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: wrapperOpacity.value,
    transform: [{ scale: wrapperScale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor }, wrapperStyle]}
    >
      <Grid
        width={width}
        height={height}
        color={primaryColor}
        progress={gridProgress}
      />

      <View style={styles.center}>
        <View style={styles.stage}>
          <Pulse progress={pulse1} color={primaryColor} maxSize={420} />
          <Pulse progress={pulse2} color={primaryColor} maxSize={420} />
          <Pulse progress={pulse3} color={primaryColor} maxSize={420} />

          <Logo
            opacity={logoOpacity}
            scale={logoScale}
            glow={logoGlow}
            color={primaryColor}
          />
        </View>

        <Wordmark
          progress={letterProgress}
          color={primaryColor}
        />

        <Subtitle opacity={subtitleOpacity} />
      </View>

      <StatusBar
        opacity={statusOpacity}
        lockedOpacity={lockedOpacity}
        color={primaryColor}
      />
    </Animated.View>
  );
}

/* ---------- subcomponents ---------- */

function Grid({
  width,
  height,
  color,
  progress,
}: {
  width: number;
  height: number;
  color: string;
  progress: SharedValue<number>;
}) {
  const lines = 5;
  const horizontals = Array.from({ length: lines });
  const verticals = Array.from({ length: lines });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {horizontals.map((_, i) => (
        <GridLine
          key={`h${i}`}
          progress={progress}
          delay={i * 0.12}
          color={color}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: ((i + 1) * height) / (lines + 1),
            height: 1,
          }}
          axis="x"
        />
      ))}
      {verticals.map((_, i) => (
        <GridLine
          key={`v${i}`}
          progress={progress}
          delay={0.4 + i * 0.1}
          color={color}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: ((i + 1) * width) / (lines + 1),
            width: 1,
          }}
          axis="y"
        />
      ))}
    </View>
  );
}

function GridLine({
  progress,
  delay,
  color,
  style,
  axis,
}: {
  progress: SharedValue<number>;
  delay: number;
  color: string;
  style: object;
  axis: 'x' | 'y';
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, (progress.value - delay) / (1 - delay)));
    return {
      opacity: local * 0.18,
      transform: axis === 'x'
        ? [{ scaleX: local }]
        : [{ scaleY: local }],
    };
  });
  return <Animated.View style={[style, { backgroundColor: color }, animatedStyle]} />;
}

function Pulse({
  progress,
  color,
  maxSize,
}: {
  progress: SharedValue<number>;
  color: string;
  maxSize: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.55,
    transform: [{ scale: 0.2 + progress.value * 1 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderWidth: 2,
          borderColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function Logo({
  opacity,
  scale,
  glow,
  color,
}: {
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  glow: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
    shadowRadius: 20 + glow.value * 30,
  }));
  return (
    <Animated.View
      style={[
        styles.logo,
        {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          elevation: 24,
        },
        style,
      ]}
    >
      <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 200 200" fill="none">
        <Path d="M 40 60 L 160 60" stroke={color} strokeWidth={18} strokeLinecap="round" />
        <Path d="M 100 60 L 100 150" stroke={color} strokeWidth={18} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Wordmark({
  progress,
  color,
}: {
  progress: SharedValue<number>;
  color: string;
}) {
  return (
    <View style={styles.wordmarkRow}>
      {WORDMARK.split('').map((char, i) => (
        <Letter key={i} char={char} index={i} progress={progress} color={color} />
      ))}
    </View>
  );
}

function Letter({
  char,
  index,
  progress,
  color,
}: {
  char: string;
  index: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, progress.value - index));
    return {
      opacity: local,
      transform: [{ translateY: (1 - local) * 14 }],
    };
  });
  return (
    <Animated.Text style={[styles.letter, { color }, animatedStyle]}>
      {char}
    </Animated.Text>
  );
}

function Subtitle({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[styles.subtitle, style]}>
      GPS · ACTIVITY · ROUTES
    </Animated.Text>
  );
}

function StatusBar({
  opacity,
  lockedOpacity,
  color,
}: {
  opacity: SharedValue<number>;
  lockedOpacity: SharedValue<number>;
  color: string;
}) {
  const scanningStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - lockedOpacity.value),
  }));
  const lockedStyle = useAnimatedStyle(() => ({ opacity: lockedOpacity.value }));
  return (
    <View style={styles.statusBar}>
      <Animated.Text style={[styles.statusText, scanningStyle]}>
        ◦ ACQUIRING SIGNAL
      </Animated.Text>
      <Animated.Text style={[styles.statusText, { color, position: 'absolute' }, lockedStyle]}>
        ● SIGNAL LOCKED
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: {
    width: LOGO_SIZE * 1.5,
    height: LOGO_SIZE * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { alignItems: 'center', justifyContent: 'center' },
  wordmarkRow: {
    flexDirection: 'row',
    marginTop: 36,
  },
  letter: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    marginHorizontal: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 12,
    fontWeight: '600',
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
  },
});
