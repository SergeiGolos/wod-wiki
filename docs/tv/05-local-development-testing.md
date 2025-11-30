# WOD Wiki TV Casting - Local Development & Testing Guide

## Overview

This document provides a comprehensive guide for setting up a local development environment and testing the WOD Wiki TV Casting feature across all components: web application, relay server, and Android TV application.

---

## Development Environment Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Relay server, web app |
| npm | 9+ | Package management |
| Android Studio | 2023.1+ (Hedgehog) | Android TV emulator, debugging |
| Java JDK | 17 | Android builds |
| React Native CLI | Latest | TV app development |
| VS Code | Latest | Primary IDE |

### Required VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "msjsdiag.vscode-react-native",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## Component Setup

### 1. Relay Server (Local)

```bash
# Navigate to relay server
cd server

# Install dependencies
npm install

# Create local environment file
cat > .env.local << EOF
PORT=8080
WS_PATH=/ws
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:6006
EOF

# Start in development mode with hot reload
npm run dev
```

**Verify Server Running**:
```bash
# Test WebSocket connection
npx wscat -c ws://localhost:8080/ws

# Expected output:
# Connected (press CTRL+C to quit)
# > {"type":"ping"}
# < {"type":"pong"}
```

### 2. Web Application (Storybook)

```bash
# From project root
cd d:\Dev\wod-wiki

# Start Storybook
npm run storybook

# Access at http://localhost:6006
```

**Configure Cast Manager for Local Development**:

```typescript
// src/services/cast/config.ts
export const CAST_CONFIG = {
  development: {
    relayServerUrl: 'ws://localhost:8080/ws',
    discoveryTimeout: 10000,
    reconnectMaxAttempts: 5,
  },
  production: {
    relayServerUrl: 'wss://relay.wodwiki.app/ws',
    discoveryTimeout: 5000,
    reconnectMaxAttempts: 10,
  },
};

export const getCastConfig = () => {
  return process.env.NODE_ENV === 'development' 
    ? CAST_CONFIG.development 
    : CAST_CONFIG.production;
};
```

### 3. Android TV Emulator

#### Create TV Emulator in Android Studio

1. Open Android Studio → **Tools** → **Device Manager**
2. Click **Create Device**
3. Select **TV** category
4. Choose **Android TV (1080p)** or **Android TV (4K)**
5. Select system image: **API 33 (Android 13)** or higher
6. Name: `tv_api_33`
7. Finish and start the emulator

#### Alternative: Command Line Setup

```bash
# List available system images
sdkmanager --list | grep "tv"

# Install TV system image
sdkmanager "system-images;android-33;google_apis;x86_64"

# Create AVD
avdmanager create avd -n tv_api_33 -k "system-images;android-33;google_apis;x86_64" -d "tv_1080p"

# Start emulator
emulator -avd tv_api_33
```

### 4. Android TV Application

```bash
# Navigate to TV app
cd tv

# Install dependencies
npm install

# Start Metro bundler
npm start

# In another terminal, build and run on TV emulator
npm run android -- --device tv_api_33
```

---

## Testing Strategies

### Unit Testing

#### Relay Server Tests

```typescript
// server/tests/session-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../src/session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;
  
  beforeEach(() => {
    manager = new SessionManager();
  });
  
  it('should create a new session', () => {
    const session = manager.createSession('sender-123');
    expect(session.id).toBeDefined();
    expect(session.senderId).toBe('sender-123');
  });
  
  it('should allow receiver to join session', () => {
    const session = manager.createSession('sender-123');
    manager.joinSession(session.id, 'receiver-456');
    
    const updated = manager.getSession(session.id);
    expect(updated?.receiverId).toBe('receiver-456');
  });
  
  it('should route messages between sender and receiver', () => {
    const session = manager.createSession('sender-123');
    manager.joinSession(session.id, 'receiver-456');
    
    const target = manager.getMessageTarget(session.id, 'sender-123');
    expect(target).toBe('receiver-456');
  });
});
```

#### Web App Cast Manager Tests

```typescript
// src/services/cast/__tests__/CastManager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CastManager } from '../CastManager';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  
  constructor(url: string) {
    setTimeout(() => this.onopen?.(), 0);
  }
  
  send = vi.fn();
  close = vi.fn();
}

describe('CastManager', () => {
  let manager: CastManager;
  
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    manager = new CastManager();
  });
  
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  
  it('should connect to relay server', async () => {
    await manager.connect('ws://localhost:8080/ws');
    expect(manager.isConnected).toBe(true);
  });
  
  it('should buffer messages when disconnected', () => {
    manager.send({ type: 'test' });
    // Message should be buffered since not connected
    expect(manager['eventBuffer'].length).toBe(1);
  });
  
  it('should implement exponential backoff', () => {
    const delays = [1, 2, 4, 8, 16, 30, 30]; // max 30s
    
    for (let i = 0; i < delays.length; i++) {
      manager['reconnectAttempts'] = i;
      const delay = manager['getReconnectDelay']();
      // Allow for jitter
      expect(delay).toBeGreaterThanOrEqual(delays[i] * 1000 * 0.7);
      expect(delay).toBeLessThanOrEqual(delays[i] * 1000 * 1.3);
    }
  });
});
```

#### TV App Component Tests

```typescript
// tv/src/components/__tests__/Timer.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Timer } from '../Timer/Timer';

describe('Timer Component', () => {
  const mockDisplayState = {
    timer: { remaining: 120000, elapsed: 60000, total: 180000 },
    label: 'AMRAP',
    isPrimary: true,
    showProgress: true,
  };
  
  it('should render timer text correctly', () => {
    const { getByText } = render(<Timer displayState={mockDisplayState} />);
    expect(getByText('2:00')).toBeTruthy();
  });
  
  it('should render label', () => {
    const { getByText } = render(<Timer displayState={mockDisplayState} />);
    expect(getByText('AMRAP')).toBeTruthy();
  });
  
  it('should apply primary styles when isPrimary is true', () => {
    const { getByTestId } = render(<Timer displayState={mockDisplayState} />);
    const timerText = getByTestId('timer-text');
    expect(timerText.props.style).toContainEqual(
      expect.objectContaining({ fontSize: 180 })
    );
  });
});
```

### Integration Testing

#### WebSocket Integration Test

```typescript
// tests/integration/websocket-relay.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { startServer, stopServer } from '../../server/src';

describe('WebSocket Relay Integration', () => {
  let serverUrl: string;
  
  beforeAll(async () => {
    const { port } = await startServer(0); // Random port
    serverUrl = `ws://localhost:${port}/ws`;
  });
  
  afterAll(async () => {
    await stopServer();
  });
  
  it('should complete full cast flow', async () => {
    // Create sender connection
    const sender = new WebSocket(serverUrl);
    await waitForOpen(sender);
    
    // Register as sender
    sender.send(JSON.stringify({
      type: 'register',
      payload: { deviceId: 'sender-1', deviceType: 'sender', deviceName: 'Web App' }
    }));
    
    // Create receiver connection
    const receiver = new WebSocket(serverUrl);
    await waitForOpen(receiver);
    
    // Register as receiver
    receiver.send(JSON.stringify({
      type: 'register',
      payload: { deviceId: 'receiver-1', deviceType: 'receiver', deviceName: 'TV' }
    }));
    
    // Sender discovers receiver
    const discoveryPromise = waitForMessage(sender, 'target-discovered');
    sender.send(JSON.stringify({ type: 'discover' }));
    const discovered = await discoveryPromise;
    expect(discovered.payload.deviceId).toBe('receiver-1');
    
    // Sender initiates cast
    const castAcceptPromise = waitForMessage(sender, 'cast-accepted');
    sender.send(JSON.stringify({
      type: 'cast-request',
      payload: { targetDeviceId: 'receiver-1', workoutScript: '3 Rounds\n10 Pushups' }
    }));
    
    // Receiver should get cast request
    const castRequest = await waitForMessage(receiver, 'cast-request');
    expect(castRequest.payload.workoutScript).toBe('3 Rounds\n10 Pushups');
    
    // Receiver accepts
    receiver.send(JSON.stringify({
      type: 'cast-accepted',
      payload: { sessionId: castRequest.payload.sessionId }
    }));
    
    // Sender should receive acceptance
    const accepted = await castAcceptPromise;
    expect(accepted.payload.sessionId).toBeDefined();
    
    // Cleanup
    sender.close();
    receiver.close();
  });
});

// Helper functions
function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) resolve();
    else ws.on('open', resolve);
  });
}

function waitForMessage(ws: WebSocket, type: string): Promise<any> {
  return new Promise((resolve) => {
    const handler = (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      if (message.type === type) {
        ws.off('message', handler);
        resolve(message);
      }
    };
    ws.on('message', handler);
  });
}
```

### End-to-End Testing

#### Detox Setup for TV App

```javascript
// tv/.detoxrc.js
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.tv.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'android.tv.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease',
    },
  },
  devices: {
    'tv.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'tv_api_33',
      },
    },
  },
  configurations: {
    'android.tv.debug': {
      device: 'tv.emulator',
      app: 'android.tv.debug',
    },
  },
};
```

#### E2E Test Example

```typescript
// tv/e2e/workout-flow.test.ts
import { device, element, by, expect } from 'detox';

describe('Workout Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display home screen on launch', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('Waiting for connection...'))).toBeVisible();
  });

  it('should navigate with D-pad', async () => {
    // Simulate D-pad navigation
    await device.pressBack(); // Menu button
    await expect(element(by.id('settings-menu'))).toBeVisible();
    
    await element(by.id('settings-menu')).tap(); // Select
    await expect(element(by.id('settings-screen'))).toBeVisible();
  });

  it('should display workout when cast received', async () => {
    // This requires mock WebSocket server
    // Trigger cast from mock sender
    await mockCastWorkout('3 Rounds\n10 Pushups');
    
    await expect(element(by.id('workout-screen'))).toBeVisible();
    await expect(element(by.text('3 Rounds'))).toBeVisible();
    await expect(element(by.text('10 Pushups'))).toBeVisible();
  });

  it('should respond to play/pause remote', async () => {
    await mockCastWorkout('5:00 Timer');
    
    // Press select (play/pause)
    await element(by.id('workout-screen')).tap();
    await expect(element(by.id('timer-running'))).toBeVisible();
    
    // Press again to pause
    await element(by.id('workout-screen')).tap();
    await expect(element(by.id('timer-paused'))).toBeVisible();
  });
});
```

---

## Manual Testing Checklist

### Pre-Testing Setup

- [ ] Relay server running locally (`npm run dev`)
- [ ] Storybook running (`npm run storybook`)
- [ ] Android TV emulator started
- [ ] TV app installed and running
- [ ] All components can reach each other on network

### Connection Flow Tests

| Test Case | Steps | Expected Result | Pass |
|-----------|-------|-----------------|------|
| Server Startup | Start relay server | Console shows "Server listening on port 8080" | ☐ |
| Web Connect | Open Storybook, navigate to Cast story | Cast button appears, connects to server | ☐ |
| TV Connect | Launch TV app | Shows "Connected" status | ☐ |
| Discovery | Click Cast button in web | TV appears in target list | ☐ |
| Cast Start | Select TV, click Cast | TV shows workout, web shows "Casting" | ☐ |
| Cast Stop | Click Stop in web | Both return to idle state | ☐ |

### State Synchronization Tests

| Test Case | Steps | Expected Result | Pass |
|-----------|-------|-----------------|------|
| Initial State | Cast workout | TV displays full workout state | ☐ |
| Timer Update | Let timer run | TV timer matches web within 100ms | ☐ |
| Round Progress | Complete round in web | TV shows updated round count | ☐ |
| Pause State | Pause workout | Both show paused state | ☐ |
| Resume State | Resume workout | Both resume synchronously | ☐ |

### Remote Control Tests

| Test Case | Steps | Expected Result | Pass |
|-----------|-------|-----------------|------|
| Play/Pause | Press center button on remote | Workout toggles state | ☐ |
| Next | Press right D-pad | Advances to next movement/round | ☐ |
| Stop (Long Press) | Long press center button | Shows stop confirmation | ☐ |
| Back | Press back button | Shows exit confirmation | ☐ |
| Navigation | D-pad during menu | Focus moves correctly | ☐ |

### Network Resilience Tests

| Test Case | Steps | Expected Result | Pass |
|-----------|-------|-----------------|------|
| TV Disconnect | Disable TV network | Web shows "Reconnecting..." | ☐ |
| TV Reconnect | Re-enable TV network | Session resumes, state syncs | ☐ |
| Server Restart | Restart relay server | Both clients reconnect | ☐ |
| High Latency | Add 500ms network delay | UI remains responsive | ☐ |
| Packet Loss | Simulate 10% packet loss | State eventually converges | ☐ |

### Heart Rate Monitor Tests

| Test Case | Steps | Expected Result | Pass |
|-----------|-------|-----------------|------|
| BLE Scan | Open HR settings on TV | Discovers nearby HR monitors | ☐ |
| Connect | Select HR monitor | Shows "Connected", displays BPM | ☐ |
| Live Update | Exercise to raise HR | BPM updates in real-time | ☐ |
| Web Sync | Check web app | HR data appears on web | ☐ |
| Disconnect | Turn off HR monitor | Shows "Disconnected", auto-scans | ☐ |
| Multi-Monitor | Connect 2+ monitors | All display separately | ☐ |

### Workout Completion Tests

| Test Case | Steps | Expected Result | Pass |
|-----------|-------|-----------------|------|
| Normal Complete | Run workout to end | Summary shows on both | ☐ |
| Metrics Sync | Check web after complete | All metrics present | ☐ |
| HR Data Sync | Complete with HR monitor | HR data in workout record | ☐ |
| Manual Stop | Stop workout early | Partial metrics saved | ☐ |

---

## Debugging Tools

### WebSocket Debugging

```bash
# Monitor WebSocket traffic
npx wscat -c ws://localhost:8080/ws

# With pretty JSON output
npm install -g wscat
wscat -c ws://localhost:8080/ws | jq .
```

### React Native Debugger

```bash
# Install standalone debugger
brew install react-native-debugger

# Or use Flipper (included with RN)
# Download from: https://fbflipper.com/
```

### ADB Commands for TV

```bash
# List connected devices
adb devices

# Connect to TV over network
adb connect <tv-ip>:5555

# View logs from TV app
adb logcat | grep -E "(ReactNative|WodWikiTV)"

# Simulate remote control
adb shell input keyevent KEYCODE_DPAD_CENTER  # Select
adb shell input keyevent KEYCODE_DPAD_UP      # Up
adb shell input keyevent KEYCODE_DPAD_DOWN    # Down
adb shell input keyevent KEYCODE_DPAD_LEFT    # Left
adb shell input keyevent KEYCODE_DPAD_RIGHT   # Right
adb shell input keyevent KEYCODE_BACK         # Back
adb shell input keyevent KEYCODE_MEDIA_PLAY_PAUSE  # Play/Pause

# Take screenshot
adb exec-out screencap -p > tv-screenshot.png

# Record screen
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

### BLE Debugging

```bash
# On TV emulator/device with root
adb shell
btsnoop_hci # Enable Bluetooth HCI snoop log

# View BLE traffic
adb bugreport > bugreport.zip
# Extract and analyze HCI log
```

---

## Performance Testing

### Latency Measurement

```typescript
// Add to state updates for measurement
interface TimestampedStateUpdate {
  displayState: IDisplayStackState;
  sentAt: number;  // Web app timestamp
  receivedAt?: number;  // TV timestamp
  latencyMs?: number;
}

// In TV app, measure on receive
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'state-update') {
    const latency = Date.now() - message.payload.sentAt;
    console.log(`State update latency: ${latency}ms`);
    
    // Track metrics
    metricsCollector.recordLatency(latency);
  }
};
```

### Memory Profiling

```bash
# Android memory dump
adb shell dumpsys meminfo com.wodwiki.tv

# React Native memory
# In Metro bundler, press 'd' to open dev menu
# Select "Show Perf Monitor"
```

### Frame Rate Monitoring

```typescript
// Add to TV app root
import { PerformanceObserver } from 'react-native';

if (__DEV__) {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.duration > 16.67) { // 60fps threshold
        console.warn(`Slow frame: ${entry.duration.toFixed(2)}ms`);
      }
    });
  });
  observer.observe({ entryTypes: ['frame'] });
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/tv-app-test.yml
name: TV App Tests

on:
  push:
    paths:
      - 'tv/**'
      - 'server/**'
      - 'cast-types/**'
  pull_request:
    paths:
      - 'tv/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: tv
      
      - name: Run unit tests
        run: npm test
        working-directory: tv
  
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd server && npm ci
          cd ../cast-types && npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        working-directory: server
  
  android-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: tv
      
      - name: Build Android APK
        run: |
          cd android
          ./gradlew assembleDebug
        working-directory: tv
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: tv-app-debug
          path: tv/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Troubleshooting Guide

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Metro bundler crash | "Unable to load script" | Clear Metro cache: `npm start -- --reset-cache` |
| Emulator not found | "No devices found" | Ensure emulator running: `adb devices` |
| WebSocket timeout | "Connection closed" | Check firewall, increase timeout |
| BLE not working | "Bluetooth unavailable" | Enable in emulator settings, use real device |
| Focus not working | D-pad doesn't navigate | Wrap in `TVFocusGuideView` |
| Slow rendering | Choppy animations | Enable Hermes, check re-renders |

### Log Locations

```bash
# Relay server logs
server/logs/

# Metro bundler logs
tv/metro.log

# Android logs
adb logcat -d > android-logs.txt

# React Native logs
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

## Test Data & Fixtures

### Sample Workout Scripts

```typescript
// tests/fixtures/workouts.ts
export const SIMPLE_TIMER = `5:00 Timer`;

export const AMRAP_WORKOUT = `
10:00 AMRAP
  10 Pushups
  15 Squats
  20 Situps
`;

export const EMOM_WORKOUT = `
10:00 EMOM
  5 Burpees
`;

export const COMPLEX_WORKOUT = `
3 Rounds
  1:00 Work
    10 Pushups
    10 Squats
  0:30 Rest

2:00 Rest

21-15-9
  Thrusters (95/65)
  Pullups
`;

export const EDGE_CASE_WORKOUT = `
1:00 Timer
  Very Long Exercise Name That Might Overflow The Display Area
`;
```

### Mock Heart Rate Data

```typescript
// tests/fixtures/heart-rate.ts
export const mockHRReadings = [
  { bpm: 72, timestamp: Date.now() - 10000, deviceId: 'hr-1' },
  { bpm: 85, timestamp: Date.now() - 9000, deviceId: 'hr-1' },
  { bpm: 102, timestamp: Date.now() - 8000, deviceId: 'hr-1' },
  { bpm: 118, timestamp: Date.now() - 7000, deviceId: 'hr-1' },
  { bpm: 135, timestamp: Date.now() - 6000, deviceId: 'hr-1' },
  { bpm: 148, timestamp: Date.now() - 5000, deviceId: 'hr-1' },
  { bpm: 156, timestamp: Date.now() - 4000, deviceId: 'hr-1' },
  { bpm: 162, timestamp: Date.now() - 3000, deviceId: 'hr-1' },
  { bpm: 158, timestamp: Date.now() - 2000, deviceId: 'hr-1' },
  { bpm: 145, timestamp: Date.now() - 1000, deviceId: 'hr-1' },
];

export const mockHRZones = {
  zone1: { min: 0, max: 104, label: 'Recovery' },
  zone2: { min: 104, max: 125, label: 'Aerobic' },
  zone3: { min: 125, max: 146, label: 'Tempo' },
  zone4: { min: 146, max: 167, label: 'Threshold' },
  zone5: { min: 167, max: 200, label: 'Anaerobic' },
};
```

---

## Next Steps

After completing local development and testing:

1. **Code Review**: Submit PR with all test coverage
2. **Staging Deployment**: Deploy relay server to staging environment
3. **Beta Testing**: Internal testing with real devices
4. **Play Store Submission**: See [06-play-store-deployment.md](06-play-store-deployment.md)
