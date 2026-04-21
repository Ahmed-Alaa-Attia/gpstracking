import React from 'react';
import { Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { GridBackground } from '@/components/GridBackground';

interface Props {
  canAskAgain: boolean;
  onRequest: () => void;
}

export function PermissionGate({ canAskAgain, onRequest }: Props) {
  const handlePress = () => {
    if (canAskAgain) onRequest();
    else Linking.openSettings();
  };
  return (
    <View className="flex-1 bg-surface">
      <GridBackground />
      <SafeAreaView className="flex-1 px-6 justify-center" edges={['top', 'bottom']}>
        <View className="bg-surface-container-high rounded-[32px] p-8 border border-outline-variant">
          <Text className="text-label-md text-primary tracking-[2px] mb-2">Location Required</Text>
          <Text className="text-headline-sm text-on-surface mb-4">Grant GPS Access</Text>
          <Text className="text-body-md text-on-surface-variant mb-6">
            Trackotest needs your location to record distance, speed, and route during a session.
            Nothing is shared off-device without your action.
          </Text>
          <Button label={canAskAgain ? 'Grant Access' : 'Open Settings'} onPress={handlePress} />
        </View>
      </SafeAreaView>
    </View>
  );
}
