/**
 * HeroCarousel widget
 *
 * Renders inside a ```widget:hero block and cycles through an array of
 * "cards" on a configurable timer. Each card has:
 *   { title, subtitle?, body?, badge?, cta? }
 *
 * Config JSON shape:
 *   {
 *     "intervalMs": 5000,
 *     "cards": [
 *       { "title": "…", "subtitle": "…", "body": "…", "badge": "New", "cta": "Go →" }
 *     ]
 *   }
 */

import React, { useEffect, useState } from "react";
import type { WidgetProps } from "./types";

// ── Types ────────────────────────────────────────────────────────────

interface HeroCard {
  title: string;
  subtitle?: string;
  body?: string;
  badge?: string;
  cta?: string;
}

interface HeroCarouselConfig {
  cards: HeroCard[];
  intervalMs?: number;
}

// ── Component ────────────────────────────────────────────────────────

export const HeroCarousel: React.FC<WidgetProps> = ({ config }) => {
  const { cards = [], intervalMs = 5000 } = config as unknown as HeroCarouselConfig;
  const [index, setIndex] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (cards.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % cards.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [cards.length, intervalMs]);

  if (cards.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        No cards configured
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6">
      {/* Badge */}
      {card.badge && (
        <span className="mb-3 self-start rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {card.badge}
        </span>
      )}

      {/* Title */}
      <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
        {card.title}
      </h2>

      {/* Subtitle */}
      {card.subtitle && (
        <p className="mt-1 text-base font-medium text-muted-foreground">
          {card.subtitle}
        </p>
      )}

      {/* Body */}
      {card.body && (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {card.body}
        </p>
      )}

      {/* CTA */}
      {card.cta && (
        <button
          className="mt-4 self-start rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          onClick={() => setIndex((i) => (i + 1) % cards.length)}
        >
          {card.cta}
        </button>
      )}

      {/* Dot indicator */}
      {cards.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-primary/30 hover:bg-primary/60"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
