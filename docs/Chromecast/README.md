# Chromecast Documentation

This section contains comprehensive documentation for the Chromecast integration in wod.wiki.

## Contents

- [Architecture](./Architecture.md) - Overview of the Chromecast system design
- [Implementation](./Implementation.md) - Implementation details and code examples

## Quick Start

To use Chromecast functionality in wod.wiki:

1. **For Users:**
   - Click the Cast button in the wod.wiki interface
   - Select your Chromecast device
   - The workout will appear on your TV/display

2. **For Developers:**
   - Import the necessary components:
   ```typescript
   import { ChromecastButton } from '@/cast/components/ChromecastButton';
   import { useCastSender } from '@/cast/hooks/useCastSender';
   ```
   
   - Add the ChromecastButton to your UI:
   ```tsx
   <ChromecastButton />
   ```
   
   - Connect to Chromecast and send events:
   ```typescript
   const { connect, sendMessage } = useCastSender();
   
   // Connect when needed
   await connect();
   
   // Send events from your runtime
   runtime.output$.subscribe(event => {
     sendMessage(event);
   });
   ```

## System Requirements

- Chrome browser 72+ (for sender)
- Chromecast device with current firmware
- Devices must be on the same network
- Stable WiFi connection recommended

## Debugging Tools

- Chrome browser: `chrome://cast/` for general Cast debugging
- Chrome browser: `chrome://cast/receiver/` for receiver debugging
- Storybook: Cast stories provide simulated environments

## Troubleshooting

Common issues:

1. **Cast button not appearing**
   - Ensure you're using Chrome browser
   - Check that a Chromecast device is available on your network

2. **Connection failures**
   - Verify network connectivity
   - Ensure both devices are on the same network

3. **Display issues**
   - Refresh the cast session
   - Check TV resolution settings