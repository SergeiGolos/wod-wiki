/**
 * Mechanical coverage guard for the analytics gallery manifest
 * (wayfinder: analytics-widget-gallery, ticket 003/008 decisions).
 *
 * The gallery's promise: every widget type, all 7 aggregators, all rollup
 * periods, all four journals, the units axis, and all three query families
 * are demonstrated live. This test fails when a card disappears or a query
 * stops parsing.
 */
import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_WIDGET_TYPES,
  WQL_AGGREGATORS,
  isFindQuery,
  isRowsQuery,
  parseQuery,
  parseQueryWidgetSuffix,
  splitWidgetBody,
} from '@bitcobblers/wod-wiki-engine';

import {
  GALLERY_CARDS,
  SECTION_ORDER,
  cardsForSection,
} from '../src/gallery/galleryManifest';

describe('gallery manifest coverage', () => {
  it('covers every dashboard widget type with a curated card', () => {
    for (const widgetType of DASHBOARD_WIDGET_TYPES) {
      const hit = GALLERY_CARDS.some(
        (card) => card.section !== 'auto' && card.widgetType === widgetType,
      );
      expect(hit, `no curated card for widget type "${widgetType}"`).toBe(true);
    }
  });

  it('covers every aggregator', () => {
    for (const aggregator of WQL_AGGREGATORS) {
      const hit = GALLERY_CARDS.some((card) => card.query.startsWith(`${aggregator}:`));
      expect(hit, `no card for aggregator "${aggregator}"`).toBe(true);
    }
  });

  it('covers unrolled, 1d and 1w rollups', () => {
    expect(GALLERY_CARDS.some((card) => card.query.includes('.rollup(1d)'))).toBe(true);
    expect(GALLERY_CARDS.some((card) => card.query.includes('.rollup(1w)'))).toBe(true);
    expect(GALLERY_CARDS.some((card) => !card.query.includes('.rollup('))).toBe(true);
  });

  it('covers all four journals', () => {
    for (const journal of ['crossfit', 'endurance', 'wellness', 'climb'] as const) {
      const hit = GALLERY_CARDS.some((card) => card.journal === journal);
      expect(hit, `no card for journal "${journal}"`).toBe(true);
    }
  });

  it('covers the units axis with a same-query kg-prefixed card', () => {
    const preferred = GALLERY_CARDS.filter((card) => card.preferredUnit !== undefined);
    expect(preferred.length).toBeGreaterThanOrEqual(1);
    const pair = preferred.find(
      (card) =>
        card.preferredUnit === 'kg' &&
        GALLERY_CARDS.some(
          (other) =>
            other !== card &&
            other.query === card.query &&
            other.journal === card.journal &&
            other.preferredUnit === undefined,
        ),
    );
    expect(pair, 'no default/preferredUnit pair for one query').toBeDefined();
  });

  it('covers all three query families with correct dispatch', () => {
    expect(GALLERY_CARDS.some((card) => card.query.startsWith('rows:'))).toBe(true);
    expect(GALLERY_CARDS.some((card) => card.query.startsWith('find:'))).toBe(true);
    expect(
      GALLERY_CARDS.some((card) => !card.query.startsWith('rows:') && !card.query.startsWith('find:')),
    ).toBe(true);
    for (const card of GALLERY_CARDS) {
      if (card.expectError) continue;
      const parsed = parseQuery(card.query);
      expect(parsed.error, `${card.title}: ${card.query}`).toBeUndefined();
      if (card.query.startsWith('rows:')) {
        expect(isRowsQuery(parsed), `${card.title} should be a rows query`).toBe(true);
      }
      if (card.query.startsWith('find:')) {
        expect(isFindQuery(parsed), `${card.title} should be a find query`).toBe(true);
      }
    }
  });

  it('every card query parses and every declared type is a known fence tag', () => {
    for (const card of GALLERY_CARDS) {
      const { query, params } = splitWidgetBody(
        card.params?.length ? [card.query, ...card.params].join(' / ') : card.query,
      );
      expect(query, card.title).toBe(card.query);
      const parsed = parseQuery(query);
      if (card.expectError) {
        expect(parsed.error, `${card.title}: expected parse error for "${card.query}"`).toBeDefined();
        continue;
      }
      expect(parsed.error, `${card.title}: ${card.query}`).toBeUndefined();
      if (card.widgetType !== 'auto' && card.widgetType !== 'rows' && card.widgetType !== 'find') {
        const suffix = parseQueryWidgetSuffix(card.widgetType);
        expect(suffix.error, `${card.title}: type "${card.widgetType}"`).toBeUndefined();
        expect(DASHBOARD_WIDGET_TYPES as readonly string[]).toContain(card.widgetType);
      }
      for (const param of params) {
        expect(param.length, `${card.title}: empty param`).toBeGreaterThan(0);
      }
    }
  });

  it('sections are complete: order covers every card, every section non-empty', () => {
    for (const section of SECTION_ORDER) {
      expect(cardsForSection(section).length, `empty section "${section}"`).toBeGreaterThan(0);
    }
    for (const card of GALLERY_CARDS) {
      expect(SECTION_ORDER).toContain(card.section);
    }
  });

  it('covers edge states: empty query, parse error, in-flight loading, and query families', () => {
    const edgeCards = cardsForSection('edge');
    expect(edgeCards.length, 'edge section should have cards').toBeGreaterThanOrEqual(3);
    expect(edgeCards.some((c) => c.expectError), 'needs parse error card').toBe(true);
    expect(
      edgeCards.some((c) => !c.expectError && c.query.includes('nonexistent') && !c.query.startsWith('rows:') && !c.query.startsWith('find:')),
      'needs empty aggregate card',
    ).toBe(true);
    expect(edgeCards.some((c) => c.simulateLoading), 'needs in-flight loading card').toBe(true);
    expect(
      edgeCards.some((c) => c.query.startsWith('rows:') && c.query.includes('nonexistent')),
      'needs empty rows card',
    ).toBe(true);
    expect(
      edgeCards.some((c) => c.query.startsWith('find:') && c.query.includes('nonexistent')),
      'needs empty find card',
    ).toBe(true);
  });
});
