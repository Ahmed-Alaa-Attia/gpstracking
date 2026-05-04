import React, { memo } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors } from '@/constants/theme';
import type { TrackPoint } from '@/lib/geo';

type Props = {
  points: TrackPoint[];
  width: number;
  height: number;
};

export const RouteThumbnail = memo(function RouteThumbnail({
  points,
  width,
  height,
}: Props) {
  if (points.length < 2) {
    return (
      <View
        className="bg-surface-dim rounded-t-xl"
        style={{ width, height }}
      />
    );
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add padding around the route so it doesn't clip the edges
  // The lower minimum delta (0.0005) allows the map to zoom in closely for very short distances
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max((maxLat - minLat) * 1.5, 0.0005);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.5, 0.0005);

  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const startCoord = coords[0];
  const endCoord = coords[coords.length - 1];

  return (
    <View
      className="bg-surface-dim rounded-t-xl overflow-hidden"
      style={{ width, height }}
    >
      <MapView
        style={{ width, height }}
        initialRegion={{ latitude, longitude, latitudeDelta, longitudeDelta }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        liteMode={true} // High performance static map for Android (perfect for FlatList)
        cacheEnabled={true} // Creates static snapshot for better performance
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        userInterfaceStyle="dark" // Professional dark theme
      >
        {/* Glow effect for a premium neon feel */}
        <Polyline
          coordinates={coords}
          strokeColor="rgba(85, 234, 77, 0.3)" // colors.primary but translucent
          strokeWidth={8}
          lineCap="round"
          lineJoin="round"
        />
        {/* Core Route Line */}
        <Polyline
          coordinates={coords}
          strokeColor={colors.primary}
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
        />

        {/* Start Marker */}
        <Marker coordinate={startCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#10b981', // green
              borderWidth: 2,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
            }}
          />
        </Marker>

        {/* End Marker */}
        <Marker coordinate={endCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#ef4444', // red
              borderWidth: 2,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
            }}
          />
        </Marker>
      </MapView>
    </View>
  );
});
