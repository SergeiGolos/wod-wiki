import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';

/**
 * Configuration interface for Clock Memory Story components.
 * This interface defines the structure for story configuration objects.
 */
export interface ClockMemoryStoryConfig {
  durationMs: number;
  isRunning: boolean;
  timeSpans?: TimeSpan[];
  title: string;
  description: string;
}

/**
 * Validates a ClockMemoryStoryConfig object against contract requirements.
 *
 * @param config - The configuration object to validate
 * @throws {Error} If validation fails with descriptive error message
 * @returns {void} Returns silently when validation passes
 */
export function validateConfig(config: ClockMemoryStoryConfig): void {
  // Validate durationMs - must be positive number
  if (typeof config.durationMs !== 'number' || config.durationMs <= 0) {
    throw new Error(`Invalid durationMs: ${config.durationMs}. Must be positive.`);
  }

  // Validate isRunning - must be boolean
  if (typeof config.isRunning !== 'boolean') {
    throw new Error(`Invalid isRunning: ${config.isRunning}. Must be boolean.`);
  }

  // Validate title - must be non-empty string
  if (typeof config.title !== 'string' || config.title.length === 0) {
    throw new Error(`Invalid title: "${config.title}". Must be non-empty.`);
  }

  // Validate description - must be non-empty string
  if (typeof config.description !== 'string' || config.description.length === 0) {
    throw new Error(`Invalid description: "${config.description}". Must be non-empty.`);
  }

  // Validate timeSpans array structure (if provided)
  if (config.timeSpans !== undefined) {
    if (!Array.isArray(config.timeSpans)) {
      throw new Error(`Invalid timeSpans: must be array or undefined.`);
    }

    // Validate each TimeSpan object in the array
    config.timeSpans.forEach((span, index) => {
      // Check if start is provided and is a Date
      if (span.start !== undefined && !(span.start instanceof Date)) {
        throw new Error(`Invalid timeSpans[${index}].start: must be Date.`);
      }

      // Check if stop is provided and is a Date
      if (span.stop !== undefined && !(span.stop instanceof Date)) {
        throw new Error(`Invalid timeSpans[${index}].stop: must be Date or undefined.`);
      }
    });
  }

  // If we reach here, validation passes - return silently
}