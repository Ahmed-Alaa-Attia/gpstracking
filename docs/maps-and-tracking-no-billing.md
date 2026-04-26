# Maps + GPS tracking: what this app does, and how to do the same in native Android (Kotlin + Compose) without a Google Maps billing account

Audience: an Android developer who will rebuild this tracking feature in native Kotlin / Jetpack Compose and wants to avoid Google Maps Platform billing. This document explains (1) how our Expo / React Native app works under the hood, (2) where Google Maps billing actually kicks in (it's more nuanced than "you owe money on day one"), and (3) several concrete, production-grade alternatives that require zero payment setup.

---

## 1. What this app actually does

### 1.1 Stack summary

| Concern | Library | What it wraps |
|---|---|---|
| Map rendering | `react-native-maps` | Google Maps SDK for Android; Apple MapKit on iOS |
| Location stream | `expo-location` | `FusedLocationProviderClient` on Android; `CLLocationManager` on iOS |
| Background updates | `expo-location` + `expo-task-manager` | Android foreground service with `ForegroundService` + `ForegroundServiceLocation` permissions; iOS `UIBackgroundModes: location` |
| Indoor step count | `expo-sensors` `Pedometer` | `Sensor.TYPE_STEP_COUNTER` on Android; `CMPedometer` on iOS |
| Compass heading | `expo-location` `watchHeadingAsync` | `TYPE_ROTATION_VECTOR` on Android; `CLLocationManager heading` on iOS |

### 1.2 How we "set points on the map" (the render loop)

The polyline on screen is *not* produced by any map API call. The map library just draws geometry we hand it. The pipeline is:

```
                     FusedLocationProviderClient
                                 │
                                 ▼
                 expo-location watchPositionAsync / task
                                 │  onLocation(loc)
                                 ▼
                 filter (lib/geo.ts acceptPoint)
                    ├── reject fixes with bad accuracy
                    ├── reject jitter (d < 0.5 × accuracy)
                    └── reject speed spikes > 30 m/s
                                 │
                                 ▼
                 setPoints([...prev, next])   ← React state
                                 │
                                 ▼
                 <Polyline coordinates={points}/> re-renders
```

That's it. A "point" is literally an object `{ lat, lng, t, speed, accuracy, segment, heading }` that gets appended to an array in a React state hook. The `<Polyline>` child in `react-native-maps` diffs the `coordinates` prop and tells the underlying `GoogleMap` / `MKMapView` to redraw a line.

Equivalent imperative Google Maps SDK calls on Android would be:

```kotlin
val poly = googleMap.addPolyline(PolylineOptions().color(...).width(...))
// on every new accepted point:
poly.points = poly.points + LatLng(lat, lng)
```

And for a marker:

```kotlin
googleMap.addMarker(MarkerOptions().position(LatLng(lat, lng)).title("Start"))
```

So the "API call to set a point" is a local SDK call into the map renderer. **There is no network round-trip per point.** The only network traffic a map view generates is *tile downloads* (the square images or vector packets that make up the visible map surface).

This matters for the billing discussion: billing is about tiles, not about points.

---

## 2. Does Google Maps require a billing account?

Short answer: **yes, even for $0 usage you must attach a billing profile to your Google Cloud project** before the Maps SDK will serve tiles. This is a 2018 policy change from Google and it hasn't reverted.

Longer answer:

### 2.1 The pricing structure (Maps Platform, current model)

Google Maps Platform billing is SKU-based. The SKUs relevant to a mobile fitness tracker are:

- **Mobile Native Dynamic Maps** (Android/iOS SDK, interactive map view)
- **Mobile Native Static Maps** (static image)

The Android native map SDK sits under "Mobile Native Dynamic Maps." Each time someone opens a screen with a map, that counts as one "map load." Historically this SKU had an unlimited free tier for mobile-native, but Google has periodically revised the model. As of the latest public pricing:

- There is a recurring monthly credit (around $200) applied across SKUs.
- Mobile map loads are very cheap per unit.
- In practice, an app like this with, say, 10k monthly sessions consumes well under the credit, so the billed amount is $0.

### 2.2 Why your friend still "needs a credit card"

Google requires a billing account be **attached and validated** (meaning: a real payment method on file) before they will issue the API key. You won't be charged unless you exceed the free credit, but they want the card on file before they serve tiles. This is the friction point people complain about.

There is no Google-hosted workaround. If you want Google's map tiles, you attach a card. Period.

### 2.3 Secondary billing risks people forget

- Geocoding, Directions, Places, Distance Matrix — these are separate SKUs, each much more expensive per call than map loads. You do **not** need any of them for a tracker that just draws a line. Make sure the Android team doesn't accidentally call them.
- Street View tiles cost more than base map tiles.
- Enabling Google Maps in an app that ships to millions of users without a usage-capping quota in Cloud Console is the real billing bomb — not the basic map view itself.

So: "Google Maps requires billing" is technically true but the actual monthly cost for a tracker is $0 if you stay inside the map-loads SKU.

---

## 3. Zero-billing alternatives (and the tradeoffs)

There is no free lunch: somebody has to serve the tile images. Your options are (a) use a free public tile server, (b) self-host, (c) use a vendor with a free tier that doesn't require a card.

### 3.1 OpenStreetMap (OSM) tiles

OSM is a crowd-sourced map database. Anyone can serve tiles from it. The OSM Foundation's public tile server is free and requires no key, but has **strict usage rules**:

- Hard-capped per-IP request rates.
- User-Agent header must identify your app.
- No bulk downloading.
- **Not acceptable for a production app with real users.**

For dev and hobby use it's fine. For an app you plan to publish, don't point at `tile.openstreetmap.org` directly.

### 3.2 osmdroid (Android-native OSM viewer)

[`osmdroid`](https://github.com/osmdroid/osmdroid) is an Android library — a drop-in replacement for `MapView` that renders OSM raster tiles.

**Pros**
- Zero API keys, zero billing, pure OSS (Apache 2.0).
- API mimics the classic Google Maps v1 API (`MapView`, `Marker`, `Polyline`, `Overlay`).
- Works on Huawei / AOSP devices that don't have Google Play Services.

**Cons**
- View-based, so in Compose you embed it via `AndroidView { MapView(it) }`.
- Raster tiles (PNG images), not vector — the zoom/rotate feel is less smooth than Google's.
- Needs a tile source you own or are permitted to use (see 3.1).

**Setup sketch (Kotlin + Compose):**

```kotlin
// build.gradle.kts
implementation("org.osmdroid:osmdroid-android:6.1.18")

// Compose wrapper
@Composable
fun OsmMap(points: List<GeoPoint>) {
  AndroidView(
    factory = { ctx ->
      Configuration.getInstance().load(ctx, PreferenceManager.getDefaultSharedPreferences(ctx))
      Configuration.getInstance().userAgentValue = ctx.packageName
      MapView(ctx).apply {
        setTileSource(TileSourceFactory.MAPNIK)
        setMultiTouchControls(true)
      }
    },
    update = { map ->
      map.overlays.removeAll { it is Polyline }
      val line = Polyline().apply {
        setPoints(points)
        outlinePaint.strokeWidth = 12f
      }
      map.overlays.add(line)
      map.invalidate()
    }
  )
}
```

For production, replace `TileSourceFactory.MAPNIK` with your own `XYTileSource` pointing at a provider from 3.4.

### 3.3 MapLibre Native (vector tiles, the real "Google alternative")

[MapLibre](https://maplibre.org/) is a community fork of Mapbox GL Native from when Mapbox closed-sourced v2. It's what most production apps use when they don't want Google. Vector tiles, GPU-accelerated, smooth pan/zoom/rotation, 3D pitch — indistinguishable from Google Maps at a glance.

**Pros**
- Modern vector rendering.
- Fully OSS (BSD-2).
- Style JSON is portable — you can swap tile providers without code changes.
- First-class Android SDK (`org.maplibre.gl:android-sdk`).

**Cons**
- You need a tile URL from *somewhere*. MapLibre is just the renderer.
- No official Compose wrapper from MapLibre itself; use `ramani-maps` (third-party Compose bindings) or embed via `AndroidView`.

**Setup sketch:**

```kotlin
implementation("org.maplibre.gl:android-sdk:11.5.2")
// optional Compose bindings
implementation("org.ramani-maps:ramani-maplibre:0.8.0")
```

```kotlin
@Composable
fun MapLibreTrack(points: List<LatLng>) {
  MapLibre(
    modifier = Modifier.fillMaxSize(),
    styleUrl = "https://tiles.openfreemap.org/styles/liberty", // free, see 3.4
    cameraPosition = rememberCameraPositionState { ... },
  ) {
    Polyline(points = points, color = Color.Blue, width = 6f)
  }
}
```

### 3.4 Free / no-card tile providers to pair with MapLibre or osmdroid

| Provider | Free tier | Card required? | Notes |
|---|---|---|---|
| **OpenFreeMap** | Unlimited, genuinely free | No | Community-run, CDN-backed vector tiles. Best choice for most cases. |
| **Protomaps** | Serverless or self-host | No | You bundle a PMTiles file or serve from CloudFront/Cloudflare R2. Zero per-request cost. |
| **MapTiler** | 100k requests/month | Yes, card on file | Easy, high-quality vector tiles. |
| **Stadia Maps** | 200k/month (personal) | No for dev | Great styles, including dark/outdoors. |
| **Thunderforest** | 150k/month (personal) | No for dev key | Raster-only, specialty cycling/outdoor styles. |
| **Mapbox** | 50k MAU mobile | Yes, card required | Excellent but requires billing, same as Google. |

For a tracker, **OpenFreeMap + MapLibre** is the clean, no-card, production-ready combo.

### 3.5 Self-hosted (Protomaps PMTiles)

If you want absolute control and zero ongoing third-party dependency:

1. Download the planet or a region extract from OSM.
2. Convert to PMTiles with the `pmtiles` CLI.
3. Host the single `.pmtiles` file on any object storage with HTTP range-request support (S3, R2, GCS, Backblaze).
4. Point MapLibre at it with the `pmtiles://` protocol and a range-request plugin.

This has a real storage cost (a regional extract might be 500 MB – 5 GB) but no per-request cost, and you never touch a maps vendor.

---

## 4. GPS / location in native Android (no Google billing)

### 4.1 Two location APIs

Android has two location APIs, and the choice affects billing and dependencies:

1. **`FusedLocationProviderClient`** (Google Play Services). Smarter, battery-aware, fuses GPS + Wi-Fi + cell towers. **Part of Play Services**, which is free to call — it is not billed the way Maps Platform SKUs are. No API key, no Cloud project, no card.
2. **`LocationManager`** (AOSP platform API). Available on every Android device including Huawei / GrapheneOS / AOSP builds without Play Services. Slightly less smart about fusing sources but fully free.

For a fitness tracker: use `FusedLocationProviderClient` if your users are all on Play-Services devices. Use `LocationManager` if you need to ship to AOSP/Huawei. Neither requires billing.

### 4.2 Manifest + permissions

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>

<service
    android:name=".TrackingService"
    android:foregroundServiceType="location"
    android:exported="false"/>
```

### 4.3 Request a high-frequency stream

```kotlin
val client = LocationServices.getFusedLocationProviderClient(context)

val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
  .setMinUpdateIntervalMillis(1000L)
  .setMinUpdateDistanceMeters(0f)          // don't gate by distance — we filter ourselves
  .setWaitForAccurateLocation(false)       // start streaming immediately
  .build()

val callback = object : LocationCallback() {
  override fun onLocationResult(result: LocationResult) {
    for (loc in result.locations) pointsChannel.trySend(loc)
  }
}

client.requestLocationUpdates(request, callback, Looper.getMainLooper())
```

### 4.4 Apply the same filter as this app

Port `lib/geo.ts` directly:

```kotlin
object GeoFilter {
  const val ACCURACY_MAX_M = 20f
  const val MIN_STEP_M = 3f
  const val MAX_SPEED_MPS = 30f
  const val JITTER_FACTOR = 0.5f

  fun accept(prev: Location?, next: Location): Boolean {
    if (next.accuracy > ACCURACY_MAX_M) return false
    if (prev == null) return true
    val d = prev.distanceTo(next)
    val unc = maxOf(prev.accuracy, next.accuracy)
    if (d < maxOf(MIN_STEP_M, unc * JITTER_FACTOR)) return false
    val dtSec = (next.time - prev.time) / 1000f
    if (dtSec > 0.1f && d / dtSec > MAX_SPEED_MPS) return false
    return true
  }
}
```

### 4.5 Foreground service for background tracking

Required for "keep recording when the screen is off" on Android 8+. The notification is mandatory — Android won't let you hide it.

```kotlin
class TrackingService : LifecycleService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIF_ID, buildNotification(),
      ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
    startLocationUpdates()
    return START_STICKY
  }
}
```

---

## 5. Indoor step counting in native Android

Same hardware sensor we use via `expo-sensors`. Zero billing, zero network.

```kotlin
class StepSource(context: Context) {
  private val sm = context.getSystemService(SensorManager::class.java)
  private val counter = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

  val steps = callbackFlow {
    var baseline: Long? = null
    val listener = object : SensorEventListener {
      override fun onSensorChanged(e: SensorEvent) {
        val cumulative = e.values[0].toLong()
        if (baseline == null) { baseline = cumulative; return }
        trySend(cumulative - baseline!!)
      }
      override fun onAccuracyChanged(s: Sensor?, a: Int) {}
    }
    sm.registerListener(listener, counter, SensorManager.SENSOR_DELAY_UI)
    awaitClose { sm.unregisterListener(listener) }
  }
}
```

`TYPE_STEP_COUNTER` is cumulative-since-boot, so we take the first reading as the baseline and diff from it. Mirrors exactly what `useLocationTracker.ts` does with `pedBaselineRef.current`.

`ACTIVITY_RECOGNITION` permission is runtime-required on Android 10+.

---

## 6. End-to-end Kotlin + Compose sketch

Putting the whole thing together:

```kotlin
@Composable
fun SessionScreen(vm: SessionViewModel = viewModel()) {
  val state by vm.state.collectAsState()

  Box(Modifier.fillMaxSize()) {
    MapLibre(
      styleUrl = "https://tiles.openfreemap.org/styles/liberty",
      cameraPosition = rememberFollowCamera(state.points.lastOrNull(), state.heading),
      modifier = Modifier.fillMaxSize()
    ) {
      Polyline(state.points.map { LatLng(it.lat, it.lng) }, color = Primary, width = 6f)
    }
    StatsSheet(
      distanceMeters = state.distance,
      durationSec = state.duration,
      steps = state.steps,
      onPause = vm::pause,
      onResume = vm::resume,
      onStop = vm::stop,
    )
  }
}

class SessionViewModel(app: Application) : AndroidViewModel(app) {
  private val loc = LocationSource(app)
  private val steps = StepSource(app)
  val state = combine(loc.acceptedPoints, steps.steps, timerFlow()) { pts, s, t ->
    SessionState(points = pts, steps = s, duration = t, distance = computeDistance(pts))
  }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(), SessionState())
}
```

No API key. No billing. Full feature parity with what you're seeing in the Expo app today.

---

## 7. Decision tree for the Android team

```
Does the app need to run on devices without Google Play Services (Huawei / AOSP)?
├── yes → osmdroid + LocationManager + SensorManager
└── no  → Do you want vector tiles and modern rendering?
         ├── yes → MapLibre + OpenFreeMap + FusedLocationProviderClient + SensorManager
         └── no  → osmdroid + FusedLocationProviderClient + SensorManager
```

Avoid Google Maps SDK unless the product specifically needs Google's Places/Directions/Street View integrations — for a tracker it adds a billing dependency for no feature gain.

---

## 8. Summary

- "Setting a point on the map" is a local SDK call; it's not a networked API, and billing has nothing to do with how many points you draw.
- Map billing is about **tiles** (the images behind your polyline). Google's tiles require a billing account attached even for $0 usage.
- Free, production-grade tile stacks exist: **MapLibre + OpenFreeMap** is the best pick for an app comparable to this one.
- Everything else (GPS stream, step counting, background service) on Android is free Android platform / Play Services surface — not billed.
