import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants, { AppOwnership } from 'expo-constants';

export const LOCATION_TASK = 'trackotest-location-task';

type Listener = (locs: Location.LocationObject[]) => void;
const listeners = new Set<Listener>();

let foregroundSub: Location.LocationSubscription | null = null;

export function subscribeLocations(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit(locs: Location.LocationObject[]) {
  listeners.forEach((fn) => {
    try { fn(locs); } catch {}
  });
}

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  const payload = data as { locations?: Location.LocationObject[] } | undefined;
  if (payload?.locations?.length) emit(payload.locations);
});

export async function startBackgroundLocation() {
  const isExpoGo = Constants.appOwnership === AppOwnership.Expo || Constants.appOwnership === 'expo';

  if (isExpoGo) {
    if (foregroundSub) return;
    foregroundSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
        activityType: Location.ActivityType.Fitness,
      },
      (location) => {
        emit([location]);
      }
    );
    return;
  }

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (started) return;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: 'Trackotest is recording',
        notificationBody: 'Your session is being tracked.',
        notificationColor: '#4F46E5',
      },
    });
  } catch (err) {
    console.warn("Background location failed to start, falling back to foreground tracking:", err);
    if (!foregroundSub) {
      foregroundSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (location) => {
          emit([location]);
        }
      );
    }
  }
}

export async function stopBackgroundLocation() {
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {}
}
