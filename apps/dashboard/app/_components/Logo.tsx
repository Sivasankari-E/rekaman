import Image from 'next/image';
import { cn } from './ui';

/**
 * Rekaman logo lockup — brand icon (lens/sphere) + wordmark. Sizes are
 * RESPONSIVE (scale up on larger screens) via Tailwind classes, not a fixed
 * pixel value, so the logo reads correctly on a phone and a desktop alike.
 * `tone` sets the wordmark colour for light surfaces (default) or the dark
 * sidebar (`onDark`).
 */
const SIZES = {
  md: { img: 'h-8 w-8 sm:h-9 sm:w-9', text: 'text-lg sm:text-xl' },
  lg: { img: 'h-10 w-10 sm:h-12 sm:w-12', text: 'text-xl sm:text-2xl' },
} as const;

export function Logo({
  tone = 'default',
  showWordmark = true,
  size = 'md',
}: {
  tone?: 'default' | 'onDark';
  showWordmark?: boolean;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      {/* Intrinsic 96px source, displayed at the responsive classes above (crisp on retina) */}
      <Image
        src="/brand/rekaman-icon.png"
        alt="Rekaman"
        width={96}
        height={96}
        priority
        className={cn(s.img, 'rounded-full')}
      />
      {showWordmark && (
        <span
          className={cn(
            s.text,
            'font-semibold tracking-tight',
            tone === 'onDark' ? 'text-sidebar-fg' : 'text-ink',
          )}
        >
          Rekaman
        </span>
      )}
    </span>
  );
}
