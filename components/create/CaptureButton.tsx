import { CameraMode } from '@/components/create/ModeSelector';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface CaptureButtonProps {
  mode: CameraMode;
  isRecording: boolean;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function CaptureButton({
  mode,
  isRecording,
  onPress,
  onPressIn,
  onPressOut,
}: CaptureButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
    onPressIn?.();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 4,
          borderColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mode === 'video' ? (
          <View
            style={
              isRecording
                ? { width: 32, height: 32, borderRadius: 6, backgroundColor: '#ef4444' }
                : { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white' }
            }
          />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'white' }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
