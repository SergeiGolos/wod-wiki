import { IdelRuntimeBlock } from "./IdelRuntimeBlock";
import { TimerRuntime } from '../timer.runtime';
import { SetButtonAction } from '../actions/SetButtonAction';
import { NextChildStatementAction } from '../actions/NextChildStatementAction';
import { test, expect, describe, beforeEach, vi } from "vitest";
import { RuntimeEvent } from "@/core/timer.types";

// Mock dependencies
vi.mock('../parser/timer.runtime');
vi.mock('../actions/SetButtonAction');
vi.mock('../actions/NextChildStatementAction');

describe('IdelRuntimeBlock', () => {
  let block: IdelRuntimeBlock;
  let mockRuntime: TimerRuntime;

  beforeEach(() => {
    // Create a new block for each test
    block = new IdelRuntimeBlock();
    mockRuntime = new TimerRuntime(null as any);
    mockRuntime.current = undefined;
  });

  describe('onEvent', () => {
    test('should handle start event correctly', () => {
      // Arrange
      const startEvent: RuntimeEvent = {
        name: 'start',
        timestamp: new Date()
      };

      // Act
      const actions = block.onEvent(startEvent, mockRuntime);

      // Assert
      expect(actions).toHaveLength(3);
      expect(actions[2]).toBeInstanceOf(SetButtonAction);
      expect(actions[0]).toBeInstanceOf(NextChildStatementAction);
    });

    test('should handle stop event correctly', () => {
      // Arrange
      const stopEvent: RuntimeEvent = {
        name: 'stop',
        timestamp: new Date()
      };

      // Act
      const actions = block.onEvent(stopEvent, mockRuntime);

      // Assert
      expect(actions).toHaveLength(2);
      // The stop action is an inline EventAction instance
      expect(actions[0].apply).toBeDefined();
    });

    test('should handle tick event correctly', () => {
      // Arrange
      const tickEvent: RuntimeEvent = {
        name: 'tick',
        timestamp: new Date()
      };

      // Act
      const actions = block.onEvent(tickEvent, mockRuntime);

      // Assert
      expect(actions).toHaveLength(0); // Currently tick doesn't produce any actions
    });

    test('should handle unknown events gracefully', () => {
      // Arrange
      const unknownEvent: RuntimeEvent = {
        name: 'unknown',
        timestamp: new Date()
      };

      // Act
      const actions = block.onEvent(unknownEvent, mockRuntime);

      // Assert
      expect(actions).toHaveLength(0);
    });    
  });
});
