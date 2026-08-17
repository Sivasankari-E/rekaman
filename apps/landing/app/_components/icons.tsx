/* Shared inline SVG icons for the marketing site. */

export function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function I({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function IcScale() { return <I><path d="M12 3v18M5 8l-3 5a3 3 0 006 0l-3-5zM19 8l-3 5a3 3 0 006 0l-3-5zM7 21h10M5 6h4l3-2 3 2h4" /></I>; }
export function IcDevices() { return <I><rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M2 18h14" /><rect x="17" y="9" width="5" height="11" rx="1.2" /></I>; }
export function IcBolt() { return <I><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></I>; }
export function IcQr() { return <I><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M20 14v0M17 20h4M21 17v4" /></I>; }
export function IcCode() { return <I><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></I>; }
export function IcGlobe() { return <I><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></I>; }
