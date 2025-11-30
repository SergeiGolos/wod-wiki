# Android TV Application Specification

## Overview

This document defines the specification for the WOD Wiki Android TV application that will display workout tracking interfaces cast from the web application. The TV app will reuse existing TypeScript code and React components where possible, supporting remote control navigation and heart rate monitor integration.

---

## 1. Architecture Pathways

Three primary approaches for building the Android TV application:

### 1.1 React Native for Android TV (Recommended)

**Approach**: Use React Native with the `react-native-tvos` or standard React Native with TV focus management.

**Pros**:
- Maximum code reuse from existing React components
- Familiar TypeScript/React development model
- Can share runtime logic (JIT compiler, memory, events)
- Active community and TV-specific libraries
- D-Pad/remote control navigation built-in via `TVFocusGuideView`

**Cons**:
- May need native modules for Bluetooth heart rate monitors
- Performance may be slightly lower than native
- TV-specific optimizations require careful attention

**Code Sharing Strategy**:
```
shared/               # Shared TypeScript/React code
├── runtime/          # Copy or npm package of runtime engine
│   ├── IScriptRuntime.ts
│   ├── IEvent.ts
│   ├── IRuntimeAction.ts
│   ├── RuntimeMetric.ts
│   └── ...
├── models/           # Shared data models
│   ├── DisplayTypes.ts
│   ├── MetricValue.ts
│   └── ExecutionRecord.ts
└── utils/            # Shared utilities
    └── formatTime.ts
```

**Recommended Libraries**:
- `react-native-ble-plx` - Bluetooth Low Energy for heart rate monitors
- `@react-navigation/native` - Navigation with TV support
- `react-native-reanimated` - Smooth animations on TV
- `zustand` or `jotai` - State management compatible with React

---

### 1.2 Capacitor/Ionic Android TV

**Approach**: Wrap the existing web application in Capacitor for Android TV.

**Pros**:
- Near 100% web code reuse
- Can use existing React components unchanged
- Familiar web development tools
- Easier maintenance (single codebase)

**Cons**:
- WebView performance limitations on TV
- More complex Bluetooth integration
- May feel less native
- Focus management for TV remotes is challenging in WebView

**Implementation**:
```bash
# Add Android TV support via Capacitor
npm install @capacitor/android @capacitor/core
npx cap add android
# Configure for TV in android/app/src/main/AndroidManifest.xml
```

---

### 1.3 Native Android with Compose (Alternative)

**Approach**: Build native Android TV app with Jetpack Compose for TV.

**Pros**:
- Best TV performance and UX
- Native Bluetooth API access
- First-class Leanback/TV support
- Google certification friendly

**Cons**:
- Cannot reuse existing TypeScript/React code
- Requires reimplementing display logic
- Separate codebase to maintain
- Longer development time

**When to Choose**: If the React Native path proves too limiting for TV UX or Bluetooth performance.

---

## 2. Recommended Approach: React Native

Based on code reuse potential and development efficiency, **React Native for Android TV** is recommended.

### 2.1 Project Structure

```
wod-wiki-tv/
├── android/                    # Native Android code
│   └── app/
│       ├── src/main/
│       │   ├── AndroidManifest.xml  # TV launcher + Bluetooth permissions
│       │   └── java/
│       │       └── com/wodwiki/tv/
│       │           └── HeartRateModule.java  # Native Bluetooth module
│       └── build.gradle
├── src/
│   ├── App.tsx                 # Root component with navigation
│   ├── screens/
│   │   ├── HomeScreen.tsx      # Cast discovery / waiting screen
│   │   ├── TrackScreen.tsx     # Main workout tracking (mirrors Track View)
│   │   └── CompleteScreen.tsx  # Workout completion summary
│   ├── components/
│   │   ├── TVTimerDisplay.tsx  # Adapted from TimerDisplay.tsx
│   │   ├── TVControlButtons.tsx # Focus-friendly button row
│   │   ├── TVActivityCard.tsx  # Adapted from ActivityCard
│   │   └── HeartRateIndicator.tsx # HR display with multi-user support
│   ├── hooks/
│   │   ├── useHeartRateMonitor.ts  # BLE heart rate subscription
│   │   ├── useCastSession.ts       # WebSocket connection to caster
│   │   └── useTVNavigation.ts      # D-pad focus management
│   ├── services/
│   │   ├── CastService.ts          # Manages cast session lifecycle
│   │   ├── HeartRateService.ts     # Bluetooth HRM management
│   │   └── MetricsSync.ts          # Sync metrics back to caster
│   └── runtime/                    # Shared from web app
│       └── ... (imported or copied)
├── shared/                     # Shared code from web app (npm link or copy)
│   └── ...
├── package.json
└── tsconfig.json
```

---

### 2.2 TV-Specific UI Adaptations

The TV interface must be optimized for:
- **10-foot viewing distance** - Larger fonts, higher contrast
- **D-pad navigation** - Focus-based UI, no touch
- **Remote control** - Limited buttons (OK, Back, Play/Pause, Direction)

#### TimerDisplay Adaptation

```tsx
// src/components/TVTimerDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTVFocus } from '../hooks/useTVNavigation';

interface TVTimerDisplayProps {
  elapsedMs: number;
  label?: string;
  format: 'countdown' | 'countup';
  durationMs?: number;
}

export const TVTimerDisplay: React.FC<TVTimerDisplayProps> = ({
  elapsedMs,
  label,
  format,
  durationMs,
}) => {
  const displayTime = format === 'countdown' && durationMs 
    ? Math.max(0, durationMs - elapsedMs)
    : elapsedMs;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Text style={styles.time}>{formatTime(displayTime)}</Text>
      {format === 'countdown' && durationMs && (
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progress, 
              { width: `${(elapsedMs / durationMs) * 100}%` }
            ]} 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 32,        // Larger for TV viewing
    color: '#888',
    marginBottom: 16,
  },
  time: {
    fontSize: 144,       // Very large for TV
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  progressContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 24,
  },
  progress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
});
```

#### Control Buttons for Remote

```tsx
// src/components/TVControlButtons.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTVEventHandler } from 'react-native';

interface TVControlButtonsProps {
  onStart: () => void;
  onPause: () => void;
  onNext: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export const TVControlButtons: React.FC<TVControlButtonsProps> = ({
  onStart,
  onPause,
  onNext,
  onStop,
  isRunning,
}) => {
  // Handle remote control events
  useTVEventHandler((evt) => {
    if (evt.eventType === 'playPause') {
      isRunning ? onPause() : onStart();
    }
  });

  return (
    <View style={styles.container}>
      <FocusableButton
        label={isRunning ? 'Pause' : 'Start'}
        onPress={isRunning ? onPause : onStart}
        color={isRunning ? '#FFC107' : '#4CAF50'}
        hasTVPreferredFocus={true}
      />
      <FocusableButton
        label="Next"
        onPress={onNext}
        color="#2196F3"
      />
      <FocusableButton
        label="Stop"
        onPress={onStop}
        color="#F44336"
      />
    </View>
  );
};
```

---

## 3. Heart Rate Monitor Integration

### 3.1 Supported Protocols

The TV app must support standard heart rate monitor protocols:

- **Bluetooth Low Energy (BLE) Heart Rate Profile** - Standard GATT service (UUID: `0x180D`)
- **ANT+ (optional)** - Requires ANT+ USB receiver

### 3.2 Multi-Monitor Support

Support multiple simultaneous heart rate monitors for group workouts:

```typescript
// src/services/HeartRateService.ts

interface HeartRateDevice {
  id: string;
  name: string;
  userId?: string;        // Assigned user for this monitor
  currentBpm: number;
  batteryLevel?: number;
  connectionState: 'connected' | 'connecting' | 'disconnected';
}

interface HeartRateServiceState {
  devices: Map<string, HeartRateDevice>;
  scanning: boolean;
}

class HeartRateService {
  private bleManager: BleManager;
  private devices: Map<string, HeartRateDevice> = new Map();
  private listeners: Set<(devices: HeartRateDevice[]) => void> = new Set();
  
  // Scan for heart rate monitors
  async startScan(): Promise<void> {
    this.bleManager.startDeviceScan(
      [HEART_RATE_SERVICE_UUID],
      null,
      (error, device) => {
        if (device && !this.devices.has(device.id)) {
          this.addDevice(device);
        }
      }
    );
  }

  // Connect to a specific monitor
  async connectDevice(deviceId: string, userId?: string): Promise<void> {
    const device = await this.bleManager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    
    // Subscribe to heart rate notifications
    device.monitorCharacteristicForService(
      HEART_RATE_SERVICE_UUID,
      HEART_RATE_MEASUREMENT_CHAR_UUID,
      (error, characteristic) => {
        if (characteristic?.value) {
          const bpm = this.parseHeartRate(characteristic.value);
          this.updateDeviceBpm(deviceId, bpm);
        }
      }
    );
    
    this.devices.set(deviceId, {
      id: deviceId,
      name: device.name || 'Unknown',
      userId,
      currentBpm: 0,
      connectionState: 'connected',
    });
  }

  // Get all connected heart rates
  getAllHeartRates(): HeartRateDevice[] {
    return Array.from(this.devices.values());
  }

  // Parse BLE heart rate data
  private parseHeartRate(base64Value: string): number {
    const data = Buffer.from(base64Value, 'base64');
    const flags = data[0];
    const is16Bit = (flags & 0x01) !== 0;
    return is16Bit ? data.readUInt16LE(1) : data[1];
  }
}
```

### 3.3 Heart Rate Display Component

```tsx
// src/components/HeartRateIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface HeartRateIndicatorProps {
  devices: HeartRateDevice[];
  compact?: boolean;
}

export const HeartRateIndicator: React.FC<HeartRateIndicatorProps> = ({
  devices,
  compact = false,
}) => {
  if (devices.length === 0) return null;

  // Single monitor - large display
  if (devices.length === 1 && !compact) {
    const device = devices[0];
    return (
      <View style={styles.largeContainer}>
        <HeartIcon bpm={device.currentBpm} />
        <Text style={styles.largeBpm}>{device.currentBpm}</Text>
        <Text style={styles.bpmLabel}>BPM</Text>
        {device.userId && (
          <Text style={styles.userName}>{device.userId}</Text>
        )}
      </View>
    );
  }

  // Multiple monitors - compact row
  return (
    <View style={styles.multiContainer}>
      {devices.map((device) => (
        <View key={device.id} style={styles.compactItem}>
          <HeartIcon bpm={device.currentBpm} size="small" />
          <Text style={styles.compactBpm}>{device.currentBpm}</Text>
          {device.userId && (
            <Text style={styles.compactName}>{device.userId}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

// Animated heart icon that pulses with BPM
const HeartIcon: React.FC<{ bpm: number; size?: 'small' | 'large' }> = ({ 
  bpm, 
  size = 'large' 
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (bpm > 0) {
      const duration = 60000 / bpm / 2; // Half beat duration
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { 
            toValue: 1.2, 
            duration, 
            useNativeDriver: true 
          }),
          Animated.timing(pulseAnim, { 
            toValue: 1, 
            duration, 
            useNativeDriver: true 
          }),
        ])
      ).start();
    }
  }, [bpm]);

  const iconSize = size === 'large' ? 48 : 24;
  
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      {/* Heart SVG/Icon */}
      <Text style={{ fontSize: iconSize, color: getHeartColor(bpm) }}>❤️</Text>
    </Animated.View>
  );
};

// Color based on heart rate zone
function getHeartColor(bpm: number): string {
  if (bpm < 100) return '#4CAF50';      // Zone 1 - Green
  if (bpm < 130) return '#8BC34A';      // Zone 2 - Light Green
  if (bpm < 150) return '#FFC107';      // Zone 3 - Yellow
  if (bpm < 170) return '#FF9800';      // Zone 4 - Orange
  return '#F44336';                      // Zone 5 - Red
}
```

---

## 4. Main Screen Implementation

### 4.1 Track Screen (Main Workout Display)

```tsx
// src/screens/TrackScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { TVTimerDisplay } from '../components/TVTimerDisplay';
import { TVControlButtons } from '../components/TVControlButtons';
import { TVActivityCard } from '../components/TVActivityCard';
import { HeartRateIndicator } from '../components/HeartRateIndicator';
import { useCastSession } from '../hooks/useCastSession';
import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';

export const TrackScreen: React.FC = () => {
  const { 
    displayState, 
    sendEvent, 
    connectionState,
    workoutComplete 
  } = useCastSession();
  
  const { devices } = useHeartRateMonitor();

  // Handle back button during workout
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Confirm before leaving during active workout
      if (displayState?.workoutState === 'running') {
        // Show confirmation dialog
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [displayState]);

  // Navigate to complete screen when workout finishes
  useEffect(() => {
    if (workoutComplete) {
      // Navigation handled by parent
    }
  }, [workoutComplete]);

  const handleStart = () => sendEvent({ name: 'start', timestamp: new Date() });
  const handlePause = () => sendEvent({ name: 'pause', timestamp: new Date() });
  const handleNext = () => sendEvent({ name: 'next', timestamp: new Date() });
  const handleStop = () => sendEvent({ name: 'stop', timestamp: new Date() });

  return (
    <View style={styles.container}>
      {/* Heart Rate Display - Top Right */}
      <View style={styles.heartRateContainer}>
        <HeartRateIndicator devices={devices} />
      </View>

      {/* Main Timer - Center */}
      <View style={styles.timerContainer}>
        <TVTimerDisplay
          elapsedMs={displayState?.totalElapsedMs || 0}
          label={displayState?.timerStack?.[0]?.label}
          format={displayState?.timerStack?.[0]?.format || 'countup'}
          durationMs={displayState?.timerStack?.[0]?.durationMs}
        />
      </View>

      {/* Round Indicator */}
      {displayState?.currentRound && (
        <View style={styles.roundIndicator}>
          <Text style={styles.roundText}>
            Round {displayState.currentRound}
            {displayState.totalRounds && ` / ${displayState.totalRounds}`}
          </Text>
        </View>
      )}

      {/* Activity Card - Below Timer */}
      {displayState?.cardStack?.[0] && (
        <View style={styles.cardContainer}>
          <TVActivityCard entry={displayState.cardStack[0]} />
        </View>
      )}

      {/* Controls - Bottom */}
      <View style={styles.controlsContainer}>
        <TVControlButtons
          onStart={handleStart}
          onPause={handlePause}
          onNext={handleNext}
          onStop={handleStop}
          isRunning={displayState?.workoutState === 'running'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 48,
  },
  heartRateContainer: {
    position: 'absolute',
    top: 48,
    right: 48,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundIndicator: {
    alignItems: 'center',
    marginVertical: 24,
  },
  roundText: {
    fontSize: 28,
    color: '#888',
  },
  cardContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  controlsContainer: {
    alignItems: 'center',
    paddingBottom: 48,
  },
});
```

---

## 5. Remote Control Navigation

### 5.1 Focus Management

```typescript
// src/hooks/useTVNavigation.ts
import { useEffect, useRef } from 'react';
import { findNodeHandle, TVEventHandler } from 'react-native';

interface TVNavigationOptions {
  onSelect?: () => void;
  onLongPress?: () => void;
  focusable?: boolean;
}

export function useTVNavigation(options: TVNavigationOptions = {}) {
  const ref = useRef(null);
  
  useEffect(() => {
    const handler = new TVEventHandler();
    
    handler.enable(null, (cmp, evt) => {
      if (evt.eventType === 'select') {
        options.onSelect?.();
      } else if (evt.eventType === 'longSelect') {
        options.onLongPress?.();
      }
    });

    return () => handler.disable();
  }, [options.onSelect, options.onLongPress]);

  return { ref, focusable: options.focusable ?? true };
}
```

### 5.2 Button Mapping

| Remote Button | Action | Implementation |
|---------------|--------|----------------|
| **OK/Select** | Confirm focused action | `eventType: 'select'` |
| **Back** | Exit/Cancel (with confirmation) | `BackHandler` |
| **Play/Pause** | Toggle timer | `eventType: 'playPause'` |
| **D-Pad Up/Down** | Navigate controls | Native focus system |
| **D-Pad Left/Right** | Navigate controls | Native focus system |
| **Menu** | Open settings overlay | Custom handler |

---

## 6. Android Manifest Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- TV Feature Declaration -->
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    
    <!-- Bluetooth Permissions for Heart Rate Monitors -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <!-- Network for Cast Communication -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:label="WOD Wiki"
        android:icon="@mipmap/ic_launcher"
        android:banner="@drawable/tv_banner"
        android:theme="@style/AppTheme">
        
        <!-- TV Launcher Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize">
            
            <!-- Standard Leanback Launcher -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 7. Shared Code Package Strategy

### 7.1 Option A: Monorepo with npm Workspaces

```
wod-wiki/
├── packages/
│   ├── core/                    # Shared runtime, types, utils
│   │   ├── src/
│   │   │   ├── runtime/        # Runtime engine (subset)
│   │   │   ├── models/         # Shared data models
│   │   │   └── utils/          # Shared utilities
│   │   └── package.json
│   ├── web/                     # Current web application
│   │   └── package.json        # depends on @wod-wiki/core
│   └── tv/                      # Android TV application
│       └── package.json        # depends on @wod-wiki/core
└── package.json                 # workspaces configuration
```

### 7.2 Option B: Git Submodule

```
wod-wiki-tv/
├── shared/                      # Git submodule -> wod-wiki/packages/core
└── src/
```

### 7.3 Recommended: Monorepo (Option A)

This approach allows:
- Single source of truth for shared code
- Atomic updates across web and TV
- Easier testing of integration
- Clear dependency graph

---

## 8. Testing Strategy

### 8.1 Unit Tests
- Test shared runtime logic (imported from web)
- Test TV-specific hooks and services
- Mock BLE for heart rate tests

### 8.2 Component Tests
- Use React Native Testing Library
- Test focus navigation flows
- Test remote control event handling

### 8.3 E2E Tests
- Use Detox or Appium for Android TV
- Test full cast session lifecycle
- Test heart rate monitor pairing flow

---

## 9. Development Setup

```bash
# Prerequisites
- Node.js 18+
- Android Studio with TV emulator
- Physical Android TV device (recommended for BLE testing)

# Setup
npx react-native init WodWikiTV --template react-native-template-typescript
cd WodWikiTV

# Install TV-specific dependencies
npm install react-native-ble-plx
npm install @react-navigation/native @react-navigation/stack

# Link native modules (if using older RN)
npx pod-install

# Run on TV emulator
npx react-native run-android --deviceId emulator-5554
```

---

## 10. Performance Considerations

1. **Frame Rate**: Target 60fps for timer updates
2. **Memory**: Limit BLE scan caching to prevent memory bloat
3. **Battery**: Minimize wake locks; use efficient BLE scanning
4. **Network**: Batch state updates to reduce WebSocket traffic
5. **TV Hardware**: Test on entry-level Android TV devices (low RAM/CPU)

---

## Next Steps

1. Set up React Native project with Android TV configuration
2. Implement CastService for WebSocket communication (see [02-web-application-updates.md](02-web-application-updates.md))
3. Implement shared runtime package
4. Build TV UI components with focus management
5. Integrate BLE heart rate monitoring
6. Define communication protocol (see [03-communication-contract.md](03-communication-contract.md))
