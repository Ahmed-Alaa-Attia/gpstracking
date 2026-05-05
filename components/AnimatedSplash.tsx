import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const SPLASH_ATHLETE_GIF = require('@/assets/SplashAthelete.gif');

interface AnimatedSplashProps {
  onAnimationComplete?: () => void;
  backgroundColor?: string;
  primaryColor?: string;
}

const PULSE_MAX = 420;

export function AnimatedSplash({
  onAnimationComplete,
  backgroundColor = '#000000',
  primaryColor = '#55ea4d',
}: AnimatedSplashProps) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const wrapperOpacity = useSharedValue(1);
  const wrapperScale = useSharedValue(1);

  const gridProgress = useSharedValue(0);

  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  /** Centered GIF hero — main splash visual */
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.88);

  const statusOpacity = useSharedValue(0);
  const lockedOpacity = useSharedValue(0);

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
      gridProgress.value = 1;
      heroOpacity.value = 1;
      heroScale.value = 1;
      subtitleOpacity.value = 1;
      wrapperOpacity.value = withDelay(
        500,
        withTiming(0, { duration: 300 }, (f) => {
          if (f) runOnJS(finishAnimation)();
        }),
      );
      return;
    }

    gridProgress.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
    statusOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));

    pulse1.value = withDelay(300, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    pulse2.value = withDelay(500, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    pulse3.value = withDelay(700, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));

    heroOpacity.value = withDelay(200, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    heroScale.value = withDelay(
      200,
      withSpring(1, { damping: 11, stiffness: 150 }, (f) => {
        if (f) runOnJS(lightHaptic)();
      }),
    );

    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    lockedOpacity.value = withDelay(
      1100,
      withTiming(1, { duration: 300 }, (f) => {
        if (f) runOnJS(mediumHaptic)();
      }),
    );

    wrapperScale.value = withDelay(
      2200,
      withTiming(1.06, { duration: 400, easing: Easing.in(Easing.cubic) }),
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
    heroOpacity,
    heroScale,
    statusOpacity,
    lockedOpacity,
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

      <View style={[styles.center, { zIndex: 2 }]}>
        <View style={styles.stage}>
          <Pulse progress={pulse1} color={primaryColor} maxSize={PULSE_MAX} />
          <Pulse progress={pulse2} color={primaryColor} maxSize={PULSE_MAX} />
          <Pulse progress={pulse3} color={primaryColor} maxSize={PULSE_MAX} />

          <SplashHero
            width={width}
            height={height}
            opacity={heroOpacity}
            scale={heroScale}
          />
        </View>

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

function SplashHero({
  width,
  height,
  opacity,
  scale,
}: {
  width: number;
  height: number;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
}) {
  const heroW = Math.min(width * 0.88, 380);
  const heroH = Math.min(height * 0.42, heroW * 1.05);
  /** Extra vertical pixels scaled inside the clip so a strip is cut off top & bottom */
  const verticalCrop = 0.1;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: heroW,
          height: heroH,
          zIndex: 3,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
    >
      <Image
        source={SPLASH_ATHLETE_GIF}
        style={{
          position: 'absolute',
          left: 0,
          width: heroW,
          top: -heroH * (verticalCrop / 2),
          height: heroH * (1 + verticalCrop),
        }}
        contentFit="cover"
        cachePolicy="memory"
        priority="high"
      />
    </Animated.View>
  );
}

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
    width: PULSE_MAX * 1.1,
    height: PULSE_MAX * 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 28,
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
