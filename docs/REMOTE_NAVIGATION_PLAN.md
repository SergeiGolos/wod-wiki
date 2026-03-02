# Plan: Enabling Remote Navigation and Focus Management

This document outlines the architectural plan to enable full remote control navigation (D-Pad) for the WOD Wiki Chromecast Web Receiver application. It follows the C4 framework to describe the system, containers, components, and code-level changes.

## 1. Goal
Enable users to navigate the Web Receiver UI using a standard TV remote (D-Pad + Select).
- **Screens**: Preview Screen (Workout selection) and Track Panel (Active workout controls).
- **Constraints**: No changes to layout or existing color schemes.
- **Visuals**: Clear focus indicators (10-foot experience).

---

## 2. C4 Framework Analysis

### L1: System Context
The Web Receiver exists in a distributed system where the **Sender App** (Mobile/Web) initiates a session, and the **Chromecast** displays the UI. Input is received from the **Physical Remote** via the Chromecast hardware, which the browser interprets as `keydown` events.

### L2: Container Diagram
The **Web Receiver Container** includes:
- **Cast Receiver SDK**: Manages connection and raw events.
- **ChromecastProxyRuntime**: Handles RPC communication with the sender.
- **React UI App**: Renders the interface and manages local focus state.

### L3: Component Diagram
The UI is composed of:
- **ReceiverApp**: The root controller.
- **ReceiverPreviewPanel**: Workout selection before starting.
- **ReceiverStackPanel**: Displays active workout steps.
- **ReceiverTimerPanel**: Contains `TimerStackView` (Main controls).
- **Spatial Navigation Manager (New)**: A hook/service to manage which element is currently focused and how focus moves.

### L4: Code Level Changes
Specific implementations for spatial logic and focus indicators.

---

## 3. Implementation Plan

### Phase 1: Spatial Navigation Logic
We will implement a `useSpatialNavigation` hook in `ReceiverApp`. This hook will:
1. Maintain a registry of "focusable" elements.
2. Track the `activeElementId`.
3. Handle `keydown` (ArrowUp, ArrowDown, ArrowLeft, ArrowRight) to calculate the next element based on spatial proximity.
4. Handle "Enter/Select" to trigger a `.click()` on the focused element.

### Phase 2: Updating the Preview Screen
The `ReceiverPreviewPanel` currently renders a static list. We will:
- Add `tabIndex={0}` to workout list items.
- Add a focus state class (e.g., `ring-2 ring-primary ring-offset-2`).

### Phase 3: Updating the Track Panel
The `TimerStackView` buttons (Play/Pause, Stop, Next) will be updated:
- Ensure they are reachable via Arrow keys (Logical flow: Timer -> Stop -> Next).
- Update focus styles to be more prominent (2px minimum thickness).
- Ensure "Action Fragments" in `FragmentSourceRow` are included in the focus registry.

### Phase 4: Visual Feedback (The "10-foot" Standard)
Following the "Mastering Remote Interaction" guide:
- Use `:focus-visible` to ensure focus only shows during remote/keyboard use.
- Implement the "Double Outline" technique for focus:
  ```css
  .focus-ring:focus-visible {
    outline: 2px solid white;
    box-shadow: 0 0 0 4px black;
    border-radius: 8px;
  }
  ```

---

## 4. Proposed Focus Paths

### Preview Screen
1. `Workout 1` (Start Focus)
2. `Workout 2` (ArrowDown)
3. ...

### Track Panel
1. **Main Timer** (Center)
2. **Stop Button** (ArrowDown)
3. **Next Button** (ArrowRight from Stop)
4. **Action Fragments** (ArrowLeft from Timer/Controls to enter the stack list)

---

## 5. Summary of Code Impact

| File | Change |
| :--- | :--- |
| `src/receiver-rpc.tsx` | Integrate `useSpatialNavigation`. Replace direct key-to-event mapping with focus selection. |
| `src/components/workout/TimerStackView.tsx` | Add focus-specific classes and ensure accessibility attributes. |
| `src/receiver-preview-panel.tsx` | (Or equivalent in `receiver-rpc.tsx`) Add `tabIndex` and focus handlers to items. |
| `src/index.css` | Add global focus-visible utilities for high-contrast visibility. |

---

## 6. Validation Plan
1. **D-Pad Emulation**: Use Chrome DevTools or a physical keyboard to verify focus moves correctly between all targets.
2. **Action Trigger**: Verify "Enter" triggers the same event (start/stop/next) as the previous hardcoded mapping.
3. **Spatial logic**: Ensure no "dead ends" where focus gets trapped.
