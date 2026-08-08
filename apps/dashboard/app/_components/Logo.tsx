import Image from 'next/image';

/**
 * Rekaman logo lockup — the brand icon (lens/sphere, navy+blue) + wordmark.
 * `tone` controls the wordmark colour so it reads on light surfaces (default)
 * or on the dark sidebar (`onDark`). The icon PNG works on both.
 */
export function Logo({
  tone = 'default',
  showWordmark = true,
  size = 28,
}: {
  tone?: 'default' | 'onDark';
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <Image
        src="/brand/rekaman-icon.png"
        alt="Rekaman"
        width={size}
        height={size}
        priority
        className="rounded-full"
      />
      {showWordmark && (
        <span
          className={`text-[17px] font-semibold tracking-tight ${
            tone === 'onDark' ? 'text-sidebar-fg' : 'text-ink'
          }`}
        >
          Rekaman
        </span>
      )}
    </span>
  );
}
