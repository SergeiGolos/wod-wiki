/**
 * Tests for OverlayWidthPolicy — pure function, no CM6 dependency.
 */

import { describe, it, expect } from "bun:test";
import {
  computeOverlayWidth,
  DEFAULT_OVERLAY_WIDTHS,
} from "../OverlayWidthPolicy";

describe("computeOverlayWidth", () => {
  // ── Default policy tests ──

  it("wod active → 35%", () => {
    expect(computeOverlayWidth({ sectionType: "wod", isActive: true })).toBe(35);
  });

  it("wod inactive → 20%", () => {
    expect(computeOverlayWidth({ sectionType: "wod", isActive: false })).toBe(20);
  });

  it("frontmatter active → 35%", () => {
    expect(computeOverlayWidth({ sectionType: "frontmatter", isActive: true })).toBe(35);
  });

  it("frontmatter inactive → 100%", () => {
    expect(computeOverlayWidth({ sectionType: "frontmatter", isActive: false })).toBe(100);
  });

  it("markdown active → 0%", () => {
    expect(computeOverlayWidth({ sectionType: "markdown", isActive: true })).toBe(0);
  });

  it("markdown inactive → 0%", () => {
    expect(computeOverlayWidth({ sectionType: "markdown", isActive: false })).toBe(0);
  });

  it("code active → 30%", () => {
    expect(computeOverlayWidth({ sectionType: "code", isActive: true })).toBe(30);
  });

  it("code inactive → 0%", () => {
    expect(computeOverlayWidth({ sectionType: "code", isActive: false })).toBe(0);
  });

  // ── User override tests ──

  it("user override takes precedence over default", () => {
    expect(
      computeOverlayWidth({ sectionType: "wod", isActive: true, userOverride: 75 }),
    ).toBe(75);
  });

  it("user override takes precedence even when inactive", () => {
    expect(
      computeOverlayWidth({ sectionType: "wod", isActive: false, userOverride: 25 }),
    ).toBe(25);
  });

  it("user override clamped to 0", () => {
    expect(
      computeOverlayWidth({ sectionType: "wod", isActive: true, userOverride: -10 }),
    ).toBe(0);
  });

  it("user override clamped to 100", () => {
    expect(
      computeOverlayWidth({ sectionType: "wod", isActive: true, userOverride: 150 }),
    ).toBe(100);
  });

  it("user override of 0 hides overlay even for active section", () => {
    expect(
      computeOverlayWidth({ sectionType: "wod", isActive: true, userOverride: 0 }),
    ).toBe(0);
  });

  // ── Custom defaults ──

  it("accepts custom defaults", () => {
    const custom = {
      ...DEFAULT_OVERLAY_WIDTHS,
      markdown: { active: 40, inactive: 10 },
    };
    expect(
      computeOverlayWidth({ sectionType: "markdown", isActive: true }, custom),
    ).toBe(40);
    expect(
      computeOverlayWidth({ sectionType: "markdown", isActive: false }, custom),
    ).toBe(10);
  });
});
