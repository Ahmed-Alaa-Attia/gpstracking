import { fontFamily } from '@/constants/fonts';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface StoryConfirmOverlayProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StoryConfirmOverlay({ visible, onConfirm, onCancel }: StoryConfirmOverlayProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 48, paddingHorizontal: 24 }}>
        <View style={{ width: '100%', backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24, gap: 16 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 20, color: 'white', textAlign: 'center' }}>
            Share to Your Story?
          </Text>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: '#a3a3a3', textAlign: 'center' }}>
            This will be visible to your followers for 24 hours.
          </Text>
          <TouchableOpacity
            onPress={onConfirm}
            style={{ backgroundColor: '#b9f600', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#263500' }}>
              Share Now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: '#a3a3a3' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
