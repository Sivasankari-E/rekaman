'use client';

import { useState } from 'react';
import type { PricingCard } from '../_lib/site';
import { Check } from './icons';

/*
 * Interactive pricing grid: the emphasized (dark) card follows the pointer —
 * hover any card and the highlight moves to it, falling back to Pro at rest.
 * Pure client state; the plan data is fetched server-side and passed in.
 */
export function PricingCards({ cards }: { cards: PricingCard[] }) {
  const proIdx = Math.max(0, cards.findIndex((c) => c.tier === 'PRO'));
  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = hovered ?? proIdx;

  return (
    <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
      {cards.map((c, i) => {
        const active = i === activeIdx;
        return (
          <div
            key={c.name}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            className={[
              'relative flex h-full flex-col rounded-2xl border p-7 transition-all duration-300 ease-out',
              active
                ? 'border-brand bg-navy text-white shadow-pop md:-translate-y-2'
                : 'border-line bg-surface text-ink shadow-card',
            ].join(' ')}
          >
            {c.tier === 'PRO' && (
              <span
                className={[
                  'absolute right-6 top-6 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  active ? 'bg-white/15 text-white' : 'bg-brand/15 text-brand',
                ].join(' ')}
              >
                Popular
              </span>
            )}

            <h3 className={`text-[20px] font-bold tracking-tight ${active ? 'text-white' : 'text-ink'}`}>{c.name}</h3>
            <p className={`text-[13px] ${active ? 'text-navy-fg/70' : 'text-muted'}`}>{c.tagline}</p>

            <div className="mt-5 flex items-baseline gap-1.5">
              {c.pricePrefix && (
                <span className={`text-[14px] font-medium ${active ? 'text-navy-fg/70' : 'text-muted'}`}>{c.pricePrefix}</span>
              )}
              <span className={`text-[36px] font-extrabold tracking-tight ${active ? 'text-white' : 'text-ink'}`}>{c.price}</span>
              <span className={`text-[14px] ${active ? 'text-navy-fg/70' : 'text-muted'}`}>{c.period}</span>
            </div>

            <ul className="mt-6 flex-1 space-y-2.5">
              {c.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-brand' : 'text-brand'}`} />
                  <span className={active ? 'text-navy-fg' : 'text-muted'}>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href={c.ctaHref}
              className={[
                'mt-7 inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-[15px] font-semibold transition-colors',
                active
                  ? 'bg-white text-navy hover:bg-white/90'
                  : 'border border-line-2 bg-surface text-ink hover:bg-surface-2',
              ].join(' ')}
            >
              {c.ctaLabel}
            </a>
          </div>
        );
      })}
    </div>
  );
}
