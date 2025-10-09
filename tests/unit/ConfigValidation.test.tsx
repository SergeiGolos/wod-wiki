import { describe, it, expect, beforeEach } from 'vitest';
import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';
import { ClockMemoryStoryConfig, validateConfig } from '../../stories/clock/utils/ConfigValidation';

describe('Config Validation', () => {
  describe('durationMs validation', () => {
    it('should accept valid positive durationMs', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: 'A valid timer configuration'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject durationMs = 0', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 0,
        isRunning: false,
        title: 'Invalid Timer',
        description: 'Timer with zero duration'
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('durationMs')
        })
      );
    });

    it('should reject negative durationMs', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: -500,
        isRunning: false,
        title: 'Invalid Timer',
        description: 'Timer with negative duration'
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('durationMs')
        })
      );
    });

    it('should reject non-number durationMs', () => {
      const invalidConfigs: ClockMemoryStoryConfig[] = [
        {
          durationMs: '1000' as any,
          isRunning: false,
          title: 'Invalid Timer',
          description: 'Timer with string duration'
        },
        {
          durationMs: null as any,
          isRunning: false,
          title: 'Invalid Timer',
          description: 'Timer with null duration'
        },
        {
          durationMs: undefined as any,
          isRunning: false,
          title: 'Invalid Timer',
          description: 'Timer with undefined duration'
        },
        {
          durationMs: {} as any,
          isRunning: false,
          title: 'Invalid Timer',
          description: 'Timer with object duration'
        }
      ];

      invalidConfigs.forEach(config => {
        expect(() => validateConfig(config)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining('durationMs')
          })
        );
      });
    });

    it('should accept large positive durationMs values', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: Number.MAX_SAFE_INTEGER,
        isRunning: false,
        title: 'Large Timer',
        description: 'Timer with very large duration'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });
  });

  describe('isRunning validation', () => {
    it('should accept valid boolean isRunning = true', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: true,
        title: 'Running Timer',
        description: 'A running timer configuration'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should accept valid boolean isRunning = false', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Stopped Timer',
        description: 'A stopped timer configuration'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject non-boolean isRunning values', () => {
      const invalidConfigs: ClockMemoryStoryConfig[] = [
        {
          durationMs: 1000,
          isRunning: 'true' as any,
          title: 'Invalid Timer',
          description: 'Timer with string isRunning'
        },
        {
          durationMs: 1000,
          isRunning: 1 as any,
          title: 'Invalid Timer',
          description: 'Timer with number isRunning'
        },
        {
          durationMs: 1000,
          isRunning: null as any,
          title: 'Invalid Timer',
          description: 'Timer with null isRunning'
        },
        {
          durationMs: 1000,
          isRunning: undefined as any,
          title: 'Invalid Timer',
          description: 'Timer with undefined isRunning'
        },
        {
          durationMs: 1000,
          isRunning: {} as any,
          title: 'Invalid Timer',
          description: 'Timer with object isRunning'
        }
      ];

      invalidConfigs.forEach(config => {
        expect(() => validateConfig(config)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining('isRunning')
          })
        );
      });
    });
  });

  describe('title validation', () => {
    it('should accept valid non-empty title', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer Title',
        description: 'A valid timer configuration'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should accept title with only spaces', () => {
      const config: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: '   ',
        description: 'Timer with space-only title'
      };

      // This should be accepted since it's not technically empty
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject empty string title', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: '',
        description: 'Timer with empty title'
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('title')
        })
      );
    });

    it('should reject null title', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: null as any,
        description: 'Timer with null title'
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('title')
        })
      );
    });

    it('should reject undefined title', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: undefined as any,
        description: 'Timer with undefined title'
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('title')
        })
      );
    });

    it('should reject non-string title', () => {
      const invalidConfigs: ClockMemoryStoryConfig[] = [
        {
          durationMs: 1000,
          isRunning: false,
          title: 123 as any,
          description: 'Timer with number title'
        },
        {
          durationMs: 1000,
          isRunning: false,
          title: {} as any,
          description: 'Timer with object title'
        },
        {
          durationMs: 1000,
          isRunning: false,
          title: [] as any,
          description: 'Timer with array title'
        }
      ];

      invalidConfigs.forEach(config => {
        expect(() => validateConfig(config)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining('title')
          })
        );
      });
    });
  });

  describe('description validation', () => {
    it('should accept valid non-empty description', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: 'A valid timer description'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should accept description with only spaces', () => {
      const config: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: '   '
      };

      // This should be accepted since it's not technically empty
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject empty string description', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: ''
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('description')
        })
      );
    });

    it('should reject null description', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: null as any
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('description')
        })
      );
    });

    it('should reject undefined description', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: undefined as any
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('description')
        })
      );
    });

    it('should reject non-string description', () => {
      const invalidConfigs: ClockMemoryStoryConfig[] = [
        {
          durationMs: 1000,
          isRunning: false,
          title: 'Valid Timer',
          description: 123 as any
        },
        {
          durationMs: 1000,
          isRunning: false,
          title: 'Valid Timer',
          description: {} as any
        },
        {
          durationMs: 1000,
          isRunning: false,
          title: 'Valid Timer',
          description: [] as any
        }
      ];

      invalidConfigs.forEach(config => {
        expect(() => validateConfig(config)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining('description')
          })
        );
      });
    });
  });

  describe('timeSpans validation', () => {
    it('should accept config without timeSpans (optional field)', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        title: 'Valid Timer',
        description: 'A valid timer configuration without timeSpans'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should accept valid timeSpans array', () => {
      const validTimeSpans: TimeSpan[] = [
        {
          start: new Date('2025-01-01T10:00:00Z'),
          stop: new Date('2025-01-01T10:05:00Z')
        },
        {
          start: new Date('2025-01-01T10:10:00Z'),
          stop: undefined // Currently running span
        }
      ];

      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: true,
        timeSpans: validTimeSpans,
        title: 'Valid Timer',
        description: 'A valid timer configuration with timeSpans'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should accept empty timeSpans array', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        timeSpans: [],
        title: 'Valid Timer',
        description: 'A valid timer configuration with empty timeSpans'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject non-array timeSpans', () => {
      const invalidConfigs: ClockMemoryStoryConfig[] = [
        {
          durationMs: 1000,
          isRunning: false,
          timeSpans: {} as any,
          title: 'Invalid Timer',
          description: 'Timer with object timeSpans'
        },
        {
          durationMs: 1000,
          isRunning: false,
          timeSpans: 'not an array' as any,
          title: 'Invalid Timer',
          description: 'Timer with string timeSpans'
        },
        {
          durationMs: 1000,
          isRunning: false,
          timeSpans: 123 as any,
          title: 'Invalid Timer',
          description: 'Timer with number timeSpans'
        }
      ];

      invalidConfigs.forEach(config => {
        expect(() => validateConfig(config)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining('timeSpans')
          })
        );
      });
    });

    it('should reject timeSpans with invalid TimeSpan structure', () => {
      const invalidTimeSpans = [
        {
          start: 'not a date' as any,
          stop: new Date()
        },
        {
          start: new Date(),
          stop: 'not a date' as any
        },
        {
          invalidProperty: 'should not exist' as any
        }
      ];

      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        timeSpans: invalidTimeSpans,
        title: 'Invalid Timer',
        description: 'Timer with invalid TimeSpan structure'
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('timeSpans')
        })
      );
    });

    it('should accept timeSpans with missing optional start/stop dates', () => {
      const validTimeSpans: TimeSpan[] = [
        {} as TimeSpan, // Completely empty span
        {
          start: new Date(),
          stop: undefined
        },
        {
          start: undefined,
          stop: new Date()
        }
      ];

      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 1000,
        isRunning: false,
        timeSpans: validTimeSpans,
        title: 'Valid Timer',
        description: 'Timer with partially defined timeSpans'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });
  });

  describe('Edge cases and comprehensive validation', () => {
    it('should validate all fields simultaneously', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 5000,
        isRunning: true,
        timeSpans: [
          {
            start: new Date('2025-01-01T10:00:00Z'),
            stop: new Date('2025-01-01T10:01:40Z')
          }
        ],
        title: 'Comprehensive Test Timer',
        description: 'A timer configuration testing all valid fields'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject config with multiple validation errors', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: -100, // Invalid: negative
        isRunning: 'yes' as any, // Invalid: not boolean
        title: '', // Invalid: empty
        description: null as any, // Invalid: null
        timeSpans: 'invalid' as any // Invalid: not array
      };

      // Should throw on first validation error encountered
      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should return silently when validation passes', () => {
      const validConfig: ClockMemoryStoryConfig = {
        durationMs: 2000,
        isRunning: false,
        title: 'Return Test Timer',
        description: 'Testing return value of validateConfig'
      };

      const result = validateConfig(validConfig);
      expect(result).toBeUndefined(); // Should return undefined (void)
    });

    it('should handle minimal valid config', () => {
      const minimalConfig: ClockMemoryStoryConfig = {
        durationMs: 1,
        isRunning: false,
        title: 'Minimal',
        description: 'Min'
      };

      expect(() => validateConfig(minimalConfig)).not.toThrow();
    });

    it('should handle maximum valid config', () => {
      const maxTimeSpans: TimeSpan[] = Array.from({ length: 1000 }, (_, i) => ({
        start: new Date(Date.now() - (i * 1000)),
        stop: i % 2 === 0 ? new Date(Date.now() - (i * 1000) + 500) : undefined
      }));

      const maxConfig: ClockMemoryStoryConfig = {
        durationMs: Number.MAX_SAFE_INTEGER,
        isRunning: true,
        timeSpans: maxTimeSpans,
        title: 'A'.repeat(1000),
        description: 'B'.repeat(1000)
      };

      expect(() => validateConfig(maxConfig)).not.toThrow();
    });
  });

  describe('Error message quality', () => {
    it('should include field name in error messages', () => {
      const testCases = [
        {
          config: { durationMs: 0, isRunning: false, title: 'Test', description: 'Test' },
          expectedField: 'durationMs'
        },
        {
          config: { durationMs: 1000, isRunning: 'false' as any, title: 'Test', description: 'Test' },
          expectedField: 'isRunning'
        },
        {
          config: { durationMs: 1000, isRunning: false, title: '', description: 'Test' },
          expectedField: 'title'
        },
        {
          config: { durationMs: 1000, isRunning: false, title: 'Test', description: '' },
          expectedField: 'description'
        },
        {
          config: { durationMs: 1000, isRunning: false, title: 'Test', description: 'Test', timeSpans: 'invalid' as any },
          expectedField: 'timeSpans'
        }
      ];

      testCases.forEach(({ config, expectedField }) => {
        expect(() => validateConfig(config as ClockMemoryStoryConfig)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(expectedField)
          })
        );
      });
    });

    it('should provide descriptive error messages', () => {
      const invalidConfig: ClockMemoryStoryConfig = {
        durationMs: -50,
        isRunning: false,
        title: 'Test Timer',
        description: 'Test description'
      };

      expect(() => validateConfig(invalidConfig)).toThrow("Invalid durationMs: -50. Must be positive.");
    });
  });
});