# Chromecast Hooks (wod.wiki)

This document describes the custom React hooks for Chromecast integration in the wod.wiki platform. These hooks provide a SOLID, observable-driven interface for sender/receiver/local casting logic, supporting robust integration with the Google Cast SDK.

## Hooks Overview

### `useCastSender`
- **Purpose:** Manages Chromecast sender state and communication.
- **Exports:**
  - `state$`: `BehaviorSubject<ChromecastState>` — observable for connection state (available, connected, connecting, device name, error)
  - `connect()`: Initiates connection to a Chromecast device
  - `disconnect()`: Ends the current Chromecast session
  - `sendMessage(event: ChromecastEvent)`: Sends a message to the receiver (no-op if not connected)
- **Usage:**
  ```tsx
  import { useCastSender } from 'src/cast/hooks/useCastSender';
  const { state$, connect, disconnect, sendMessage } = useCastSender();
  ```
- **Notes:**
  - Uses RxJS for observable state.
  - Handles error/debug logging internally.

### `useCastReceiver`
- **Purpose:** (Stub for sender-side dev/testing) — In a real receiver app, exposes an observable event$ for all incoming Chromecast messages.
- **Exports:**
  - `event$`: `Subject<ChromecastEvent>`
- **Usage:**
  ```tsx
  import { useCastReceiver } from 'src/cast/hooks/useCastReceiver';
  const { event$ } = useCastReceiver();
  ```
- **Notes:**
  - For sender-side dev only; true receiver logic is implemented in the receiver project.

### `useLocalCast`
- **Purpose:** Simulates a fully connected sender/receiver pair for local/dev/test use.
- **Exports:**
  - `state$`: `BehaviorSubject<ChromecastState>` (always connected)
  - `event$`: `Subject<ChromecastEvent>` (loopback)
  - `sendMessage(event: ChromecastEvent)`: Immediately echoes to event$
- **Usage:**
  ```tsx
  import { useLocalCast } from 'src/cast/hooks/useLocalCast';
  const { state$, event$, sendMessage } = useLocalCast();
  ```

## Deprecated

### `useChromecast`
- **Status:** Deprecated — use the new hooks above for all new code.
- **Migration:** Replace usages with the appropriate new hook(s). The old hook will be removed in a future release.

## Best Practices
- Always use the unified `CAST_NAMESPACE` from `types/chromecast-events.ts`.
- Use observables for all state/event flows.
- Add robust error/debug logging for all Cast operations.
- For receiver-side logic, implement in a dedicated receiver project as per Google Cast CAF v3 best practices.

---

For more details, see:
- [docs/Notes/Chomecas Reciever Grounding.md](../Notes/Chomecas%20Reciever%20Grounding.md)
- [docs/Working/2025.04-19.chromecasting-push.md](../Working/2025.04-19.chromecasting-push.md)
