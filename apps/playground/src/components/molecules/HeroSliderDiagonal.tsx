/**
 * HeroSliderDiagonal widget
 *
 * A full-width hero section that cycles through slides using a diagonal "slice"
 * transition effect. Slides are split into diagonal strips that sweep in and out
 * at an angle, creating a more dynamic, modern feel.
 *
 * Config JSON shape:
 *   {
 *     "intervalMs": 6000,
 *     "autoPlay": true,
 *     "slices": 10,
 *     "angle": -25,
 *     "slides": [
 *       {
 *         "title": "…",
 *         "subtitle": "…",
 *         "body": "…",
 *         "badge": "New",
 *         "cta": { "label": "Go →", "href": "#" },
 *         "bgGradient": "from-primary/10 via-background to-secondary/10"
 *       }
 *     ]
 *   }
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { WidgetProps } from '@/components/Editor/widgets/types';

// ── Types ────────────────────────────────────────────────────────────

interface SlideCta {
  label: string;
  href?: string;
}

interface Slide {
  title: string;
  subtitle?: string;
  body?: string;
  badge?: string;
  cta?: SlideCta;
  bgGradient?: string;
}

interface HeroSliderDiagonalConfig {
  slides: Slide[];
  intervalMs?: number;
  autoPlay?: boolean;
  slices?: number;
  angle?: number;
}

// ── Component ────────────────────────────────────────────────────────

export const HeroSliderDiagonal: React.FC<WidgetProps> = ({ config }) => {
  const {
    slides = [],
    intervalMs = 6000,
    autoPlay = true,
    slices = 10,
    angle = -25,
  } = config as unknown as HeroSliderDiagonalConfig;

  const [[index, direction], setIndex] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideCount = slides.length;

  const paginate = useCallback(
    (newDirection: number) => {
      setIndex(([prev]) => {
        const next = (prev + newDirection + slideCount) % slideCount;
        return [next, newDirection];
      });
    },
    [slideCount]
  );

  // Auto-advance
  useEffect(() => {
    if (!autoPlay || slideCount <= 1 || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => paginate(1), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, intervalMs, isPaused, paginate, slideCount]);

  if (slideCount === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        No slides configured
      </div>
    );
  }

  const currentSlide = slides[index];
  const sliceArray = Array.from({ length: slices }, (_, i) => i);
  const sliceWidth = 100 / slices;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background layer with gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${
          currentSlide.bgGradient || "from-primary/10 via-background to-secondary/10"
        }`}
      />

      {/* Diagonal slice transition container */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            className="absolute inset-0 flex"
            custom={direction}
          >
            {sliceArray.map((sliceIndex) => {
              const isEven = sliceIndex % 2 === 0;
              const staggerDelay = sliceIndex * 0.03;
              const yOffset = direction > 0 ? (isEven ? -40 : 40) : (isEven ? 40 : -40);

              return (
                <motion.div
                  key={sliceIndex}
                  className="relative h-full overflow-hidden"
                  style={{
                    width: `${sliceWidth}%`,
                    transform: `skewX(${angle}deg)`,
                    transformOrigin: "center center",
                  }}
                  initial={{
                    x: direction > 0 ? 300 : -300,
                    opacity: 0,
                    scaleY: 0.8,
                  }}
                  animate={{
                    x: 0,
                    opacity: 1,
                    scaleY: 1,
                  }}
                  exit={{
                    x: direction > 0 ? -300 : 300,
                    opacity: 0,
                    scaleY: 0.8,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.32, 0.72, 0, 1],
                    delay: staggerDelay,
                  }}
                >
                  {/* Each slice shows a clipped portion of the slide content */}
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      left: `${-sliceIndex * sliceWidth}%`,
                      width: `${slices * sliceWidth}%`,
                      transform: `skewX(${-angle}deg)`, // counter-skew content
                    }}
                  >
                    <div className="flex h-full w-full flex-col justify-center px-6 py-8 sm:px-10 lg:px-16">
                      <motion.div
                        initial={{ opacity: 0, y: yOffset }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -yOffset }}
                        transition={{
                          duration: 0.5,
                          ease: [0.32, 0.72, 0, 1],
                          delay: 0.2 + staggerDelay,
                        }}
                        className="max-w-2xl"
                      >
                        {currentSlide.badge && (
                          <span className="mb-3 inline-block self-start rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {currentSlide.badge}
                          </span>
                        )}

                        <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                          {currentSlide.title}
                        </h2>

                        {currentSlide.subtitle && (
                          <p className="mt-2 text-base font-medium text-muted-foreground sm:text-lg">
                            {currentSlide.subtitle}
                          </p>
                        )}

                        {currentSlide.body && (
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                            {currentSlide.body}
                          </p>
                        )}

                        {currentSlide.cta && (
                          <a
                            href={currentSlide.cta.href || "#"}
                            className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                          >
                            {currentSlide.cta.label}
                          </a>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {slideCount > 1 && (
        <>
          <button
            onClick={() => paginate(-1)}
            className="absolute left-3 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Previous slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-3 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Next slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slideCount > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => paginate(i > index ? 1 : -1)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-primary"
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
