/**
 * HeroBanner Component
 *
 * Full-width hero section for page shells.
 * Supports gradient, image, or plain background variants.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface HeroBannerProps {
  /** Primary heading text */
  title: string;

  /** Optional subtitle / tagline */
  subtitle?: string;

  /** Optional call-to-action element */
  cta?: ReactNode;

  /** Background visual variant */
  backgroundVariant?: 'gradient' | 'image' | 'plain';

  /** Additional CSS classes */
  className?: string;
}

/**
 * HeroBanner — page header with title, subtitle, and CTA.
 *
 * Visual variants:
 * - gradient: radial primary-color glow
 * - image: transparent (parent supplies background)
 * - plain: no decoration
 */
export function HeroBanner({
  title,
  subtitle,
  cta,
  backgroundVariant = 'gradient',
  className,
}: HeroBannerProps) {
  return (
    <section
      className={cn(
        'relative px-6 pt-24 pb-16 lg:pt-36 lg:pb-24 overflow-hidden',
        className,
      )}
    >
      {/* Background decoration */}
      {backgroundVariant === 'gradient' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
          }}
        />
      )}

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center gap-8">
          <div className="space-y-6">
            <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl text-foreground uppercase drop-shadow-sm">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {cta && <div className="mt-4">{cta}</div>}
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
