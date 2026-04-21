import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Wallet() {
  return (
    <View className="flex-1 bg-surface" style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View className="flex-1 px-6 pt-6" style={{ flex: 1 }}>
        <Text className="text-label-md text-on-surface-variant">
          Neon Cartographer
        </Text>
        <Text className="text-display-lg text-on-surface mt-2">
          Assets
          {'\n'}
          <Text className="text-primary">Wallet.</Text>
        </Text>
        <Text className="text-body-md text-on-surface-variant mt-4">
          Manage your telemetry credits and subscription status.
        </Text>
      </View>
      </SafeAreaView>
    </View>
  );
}
