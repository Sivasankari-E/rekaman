'use client';

import { useEffect, useRef, useState } from 'react';

function initials(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

/**
 * Top-right account menu. The trigger shows the brand avatar + name; opening it
 * reveals the brand, the signed-in user, and a sign-out action.
 */
export function ProfileMenu({
  brandName,
  email,
  onLogout,
}: {
  brandName: string;
  email: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-fg">
          {initials(brandName)}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink sm:inline">
          {brandName}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{brandName}</p>
            <p className="mt-0.5 truncate text-xs text-muted">Signed in as {email}</p>
          </div>
          <div className="border-t border-line" />
          <button
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
