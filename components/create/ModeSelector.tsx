import { fontFamily } from '@/constants/fonts';
import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

export type CameraMode = 'photo' | 'video' | 'story' | 'boomerang';

const MODES: { key: CameraMode; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'video', label: 'Video' },
  { key: 'story', label: 'Story' },
  { key: 'boomerang', label: 'Boomerang' },
];

interface ModeSelectorProps {
  selected: CameraMode;
  onSelect: (mode: CameraMode) => void;
}

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
      }}
    >
      {MODES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => onSelect(key)}
          activeOpacity={0.8}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: selected === key ? '#b9f600' : 'rgba(0,0,0,0.5)',
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semibold,
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: selected === key ? '#263500' : '#ffffff',
            }}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
