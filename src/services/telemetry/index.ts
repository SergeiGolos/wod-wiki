export { TelemetryService } from './TelemetryService';
export type { TelemetryEvent, TelemetryForwarder, TelemetryServiceOptions } from './TelemetryService';
export { HOME_EVENTS } from './homeEvents';
export type { HomeEventName } from './homeEvents';
export { useTelemetry } from './useTelemetry';

import { TelemetryService } from './TelemetryService';

/** App-wide telemetry singleton. The forwarder is wired by the playground shell (lib/telemetry-gtag). */
export const telemetry = new TelemetryService();
