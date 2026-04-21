import React, { useMemo, useRef, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { TrackPoint } from '@/lib/geo';
import { colors } from '@/constants/theme';
import { darkMapStyle } from './darkMapStyle';

interface Props {
  points: TrackPoint[];
  follow: boolean;
  heading?: number | null;
  initialRegion?: Region;
  onUserPan?: () => void;
}

function splitSegments(points: TrackPoint[]): TrackPoint[][] {
  const segments: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  let segId = -1;
  for (const p of points) {
    if (p.segment !== segId) {
      if (current.length) segments.push(current);
      current = [p];
      segId = p.segment;
    } else {
      current.push(p);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

export function SessionMap({ points, follow, heading, initialRegion, onUserPan }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const didFitRef = useRef(false);
  const segments = useMemo(() => splitSegments(points), [points]);

  useEffect(() => {
    if (!follow || points.length === 0 || !mapRef.current) return;
    const last = points[points.length - 1];
    const cameraParams: Parameters<typeof mapRef.current.animateCamera>[0] = {
      center: { latitude: last.lat, longitude: last.lng },
      zoom: 17,
      altitude: 1500,
      pitch: 0,
    };
    const h = heading != null && heading >= 0
      ? heading
      : last.heading != null && last.heading >= 0 ? last.heading : null;
    if (h != null) cameraParams.heading = h;
    mapRef.current.animateCamera(cameraParams, { duration: 500 });
  }, [follow, points, heading]);

  useEffect(() => {
    if (follow || didFitRef.current || points.length < 2 || !mapRef.current) return;
    const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: false,
    });
    didFitRef.current = true;
  }, [follow, points]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPanDrag={onUserPan}
      >
        {segments.map((seg, idx) => {
          const coords = seg.map((p) => ({ latitude: p.lat, longitude: p.lng }));
          return (
            <React.Fragment key={idx}>
              <Polyline
                coordinates={coords}
                strokeColor={colors.primary + '55'}
                strokeWidth={12}
              />
              <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={5} />
            </React.Fragment>
          );
        })}
        {points.length > 0 && (
          <Marker
            coordinate={{ latitude: points[0].lat, longitude: points[0].lng }}
            title="Start"
            pinColor="green"
          />
        )}
        {points.length > 1 && !follow && (
          <Marker
            coordinate={{ latitude: points[points.length - 1].lat, longitude: points[points.length - 1].lng }}
            title="End"
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
}
