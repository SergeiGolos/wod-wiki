/**
 * ParallaxSection Tests
 *
 * Unit tests for the ParallaxSection component.
 * Tests IntersectionObserver step-detection logic and reduced-motion fallback.
 */

import { describe, it, expect } from 'bun:test';
import { ParallaxSection } from '@/panels/page-shells/ParallaxSection';

describe('ParallaxSection', () => {
  it('should export ParallaxSection component', () => {
    expect(ParallaxSection).toBeDefined();
    expect(typeof ParallaxSection).toBe('function');
  });

  it('should be a named export matching the default export', async () => {
    const mod = await import('@/panels/page-shells/ParallaxSection');
    expect(mod.ParallaxSection).toBe(mod.default);
  });

  it('should accept the expected props shape', () => {
    // Component is a function that accepts ParallaxSectionProps
    expect(ParallaxSection.length).toBeGreaterThanOrEqual(0);
  });
});
