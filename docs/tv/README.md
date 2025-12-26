# WOD Wiki TV Casting Feature

## Overview

This directory contains the design specifications for the WOD Wiki TV Casting feature, which enables users to cast workouts from the web application to an Android TV device for a large-screen workout experience with heart rate monitor integration.

---

## Feature Summary

### Core Capabilities

1. **Cast Workout to TV**: From the Track View, users can discover and cast to an Android TV device
2. **Remote Control Integration**: TV remote controls workout playback (Start, Pause, Next, Stop)
3. **Heart Rate Monitor Support**: Connect Bluetooth heart rate monitors to the TV for real-time tracking
4. **Metrics Sync**: All workout metrics and heart rate data sync back to the web app on completion
5. **Multi-User Ready**: Architecture supports multiple users per session (future enhancement)

### User Flow

```
Web App (Track View)                    Android TV
        │                                    │
        │  1. Click "Cast" button            │
        │─────────────────────────────────▶ │
        │                                    │  2. TV shows workout
        │  3. User controls via remote       │
        │◀────────────────────────────────── │
        │                                    │  4. HR data streams
        │◀────────────────────────────────── │
        │                                    │
        │  5. Workout completes              │
        │◀─── Final metrics sync ─────────── │
        │                                    │
        │  6. Exit cast, view analytics      │
        │                                    │
```

---

## Documents

### [01-android-tv-application-spec.md](01-android-tv-application-spec.md)

**Purpose**: Specification for building the Android TV application

**Key Topics**:
- Architecture pathway comparison (React Native vs Capacitor vs Native)
- React Native project structure and setup
- TV-specific UI adaptations (10-foot viewing, D-pad navigation)
- Heart rate monitor Bluetooth integration (BLE Heart Rate Profile)
- Multi-monitor support for group workouts
- Remote control button mapping
- Android Manifest configuration

**Recommendation**: React Native for Android TV with shared TypeScript/React code

---

### [02-web-application-updates.md](02-web-application-updates.md)

**Purpose**: Modifications needed in the existing web application

**Key Topics**:
- CastManager service architecture
- CastSession lifecycle management
- React hooks for casting (`useCastManager`, `useCastSession`)
- UI components (`CastButton`, `CastTargetList`, `CastingStatus`)
- Integration with existing RuntimeProvider and WorkbenchContext
- Workout completion flow with metrics merging
- Feature flag configuration

**New Files Required**:
- `src/services/cast/CastManager.ts`
- `src/services/cast/CastSession.ts`
- `src/hooks/useCastManager.ts`
- `src/components/cast/CastButton.tsx`

---

### [03-communication-contract.md](03-communication-contract.md)

**Purpose**: Protocol definition for web ↔ TV communication

**Key Topics**:
- WebSocket relay server architecture
- Complete message type definitions (20+ message types)
- State synchronization protocol
- Heart rate data batching strategy
- Workout completion data package
- Error handling and reconnection strategies
- Protocol versioning
- Security considerations

**Message Categories**:
- Connection & Discovery (`register`, `discover`, `target-discovered`)
- Session Lifecycle (`cast-request`, `cast-accepted`, `cast-stop`)
- State Sync (`state-update`, `state-ack`)
- Events (`event-from-receiver`)
- Metrics (`metrics-batch`, `workout-complete`)

---

### [04-implementation-plan.md](04-implementation-plan.md)

**Purpose**: Detailed implementation roadmap with best practices

**Key Topics**:
- Research summary from industry best practices
- Phase-by-phase implementation guide (5 phases, 7 weeks)
- Code examples for all major components
- React Native TV setup with `react-native-tvos`
- WebSocket reconnection with exponential backoff
- BLE Heart Rate Service implementation
- Multi-monitor support for group workouts
- Testing strategy and success metrics
- Risk mitigation and resource requirements

**Research Sources**:
- react-native-tvos (0.76.5-0) documentation
- Android TV design guidelines
- Socket.IO best practices
- Google Cast architecture patterns
- BLE Heart Rate Profile specification
- Health Connect SDK integration

---

### [05-local-development-testing.md](05-local-development-testing.md)

**Purpose**: Local development environment setup and testing guide

**Key Topics**:
- Development environment prerequisites
- Relay server local setup
- Android TV emulator configuration
- Unit testing strategies (Vitest)
- Integration testing (WebSocket flows)
- End-to-end testing (Detox for TV)
- Manual testing checklists
- Debugging tools (ADB, BLE, WebSocket)
- Performance testing and profiling
- CI/CD integration with GitHub Actions
- Troubleshooting common issues

**Test Categories**:
- Connection flow tests
- State synchronization tests
- Remote control tests
- Network resilience tests
- Heart rate monitor tests
- Workout completion tests

---

### [06-play-store-deployment.md](06-play-store-deployment.md)

**Purpose**: Google Play Store submission and deployment guide

**Key Topics**:
- Google Play Developer Account setup
- Android Manifest configuration for TV
- App signing and build configuration
- Store listing assets (banner, screenshots, graphics)
- Store listing content (descriptions, category)
- Privacy policy requirements
- Data safety form completion
- Testing tracks (Internal, Closed, Open)
- Production release process
- Post-launch monitoring
- CI/CD for automated releases
- Common rejection reasons and solutions

**Deployment Stages**:
- Internal testing (immediate)
- Closed beta (1-3 days review)
- Open testing (1-3 days review)
- Production (3-7 days initial review)

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1-2)
- [ ] Set up WebSocket relay server
- [ ] Implement CastManager service in web app
- [ ] Create shared protocol types package

### Phase 2: Web App Integration (Week 2-3)
- [ ] Add CastButton to Track View toolbar
- [ ] Implement discovery flow
- [ ] Add runtime state forwarding
- [ ] Handle incoming receiver events

### Phase 3: Android TV App (Week 3-5)
- [ ] Set up React Native project for TV
- [ ] Implement TV-optimized UI components
- [ ] Integrate WebSocket client
- [ ] Add remote control navigation

### Phase 4: Heart Rate Integration (Week 5-6)
- [ ] Implement BLE heart rate service on TV
- [ ] Add metrics batching and sync
- [ ] Update analytics view for HR data

### Phase 5: Testing & Polish (Week 6-7)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation

---

## Technical Dependencies

### Web Application
- WebSocket client (native browser API)
- UUID generation (`uuid` package)
- Existing: RuntimeProvider, WorkbenchContext, TimerDisplay

### Android TV Application
- React Native 0.72+
- `react-native-ble-plx` for Bluetooth
- `@react-navigation/native` for TV navigation
- `react-native-reanimated` for animations

### Relay Server
- Node.js 18+ or Deno
- WebSocket library (`ws` for Node.js)
- Redis (optional, for session persistence)

---

## Key Interfaces

### Shared Between Web & TV

```typescript
// Display state sent from web to TV
interface IDisplayStackState {
  timerStack: ITimerDisplayEntry[];
  cardStack: IDisplayCardEntry[];
  workoutState: 'idle' | 'running' | 'paused' | 'complete';
  totalElapsedMs?: number;
  currentRound?: number;
  totalRounds?: number;
}

// Events sent from TV to web
interface IEvent {
  name: 'start' | 'pause' | 'stop' | 'next';
  timestamp: Date;
  data?: any;
}

// Heart rate data point
interface HeartRateDataPoint {
  timestamp: number;
  bpm: number;
  deviceId: string;
  userId?: string;
}
```

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TV Platform | React Native | Maximum code reuse, familiar tooling |
| Communication | WebSocket via Relay | NAT traversal, discovery, reconnection |
| State Sync | Full state + delta | Balance between simplicity and efficiency |
| HR Data | Batched (5 sec) | Reduce network overhead |
| Protocol | JSON over WebSocket | Human-readable, easy debugging |

---

## Open Questions

1. **Offline Support**: Should TV app work offline with cached workouts?
2. **Multi-Caster**: Can multiple web apps control the same TV?
3. **Persistence**: Should relay server persist sessions for recovery?
4. **Authentication**: When/if to add user authentication?
5. **ANT+ Support**: Add ANT+ in addition to BLE for heart rate?

---

## Related Documentation

- [Runtime System](../generated/runtime-system.md) - Understanding the runtime execution engine
- [Display Types](../../src/clock/types/DisplayTypes.ts) - Source for display state types
- [Block Types Reference](../block-types-behaviors-reference.md) - Detailed block and behavior documentation
- [Runtime Lifecycle](../runtime-action-lifecycle.md) - Runtime lifecycle patterns

---

## Contact

For questions about these specifications, open an issue in the GitHub repository or discuss in the project's communication channels.
