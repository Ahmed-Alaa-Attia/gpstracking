import React from 'react';
import { View } from 'react-native';

export const GridBackground = () => (
  <View
    className="absolute top-0 left-0 right-0 bottom-0 opacity-5"
    pointerEvents="none">
    {Array.from({ length: 20 }).map((_, i) => (
      <View
        key={`h-${i}`}
        className="absolute left-0 right-0 h-px bg-primary"
        style={{ top: i * 40 }}
      />
    ))}
    {Array.from({ length: 20 }).map((_, i) => (
      <View
        key={`v-${i}`}
        className="absolute top-0 bottom-0 w-px bg-primary"
        style={{ left: i * 40 }}
      />
    ))}
  </View>
);
