import { describe, it, expect } from 'bun:test';
import { 
  PRIORITY_INFRASTRUCTURE, 
  PRIORITY_PRE_EXECUTION_MIN,
  PRIORITY_CORE_MIN,
  PRIORITY_POST_EXECUTION_MIN,
  PRIORITY_CLEANUP_MIN,
  PRIORITY_DEFAULT
} from '../BehaviorPriority';

describe('BehaviorPriority', () => {
  describe('priority constants', () => {
    it('should define infrastructure priority range', () => {
      expect(PRIORITY_INFRASTRUCTURE).toBe(0);
      expect(PRIORITY_INFRASTRUCTURE).toBeLessThan(PRIORITY_PRE_EXECUTION_MIN);
    });

    it('should define pre-execution priority range', () => {
      expect(PRIORITY_PRE_EXECUTION_MIN).toBe(100);
      expect(PRIORITY_PRE_EXECUTION_MIN).toBeLessThan(PRIORITY_CORE_MIN);
    });

    it('should define core logic priority range', () => {
      expect(PRIORITY_CORE_MIN).toBe(500);
      expect(PRIORITY_CORE_MIN).toBeLessThan(PRIORITY_POST_EXECUTION_MIN);
    });

    it('should define post-execution priority range', () => {
      expect(PRIORITY_POST_EXECUTION_MIN).toBe(1000);
      expect(PRIORITY_POST_EXECUTION_MIN).toBeLessThan(PRIORITY_CLEANUP_MIN);
    });

    it('should define cleanup priority range', () => {
      expect(PRIORITY_CLEANUP_MIN).toBe(1500);
    });

    it('should define default priority', () => {
      expect(PRIORITY_DEFAULT).toBe(PRIORITY_POST_EXECUTION_MIN);
    });
  });

  describe('priority ordering', () => {
    it('should maintain correct priority order', () => {
      const priorities = [
        PRIORITY_INFRASTRUCTURE,
        PRIORITY_PRE_EXECUTION_MIN,
        PRIORITY_CORE_MIN,
        PRIORITY_POST_EXECUTION_MIN,
        PRIORITY_CLEANUP_MIN
      ];

      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeLessThan(priorities[i + 1]);
      }
    });
  });
});
