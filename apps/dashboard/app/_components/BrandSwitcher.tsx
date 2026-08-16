'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, type MeResponse } from '../_lib/api';
import { Spinner } from './ui';

type Membership = MeResponse['memberships'][number];

/*
 * Sidebar brand switcher. A user can belong to multiple brands (via team
 * invites); switching re-issues the auth cookie scoped to the chosen brand,
 * then we hard-reload so every brand-scoped page re-fetches cleanly.
 * With a single membership it renders static (no dropdown).
 */
export function BrandSwitcher({
  memberships,
  activeBrandId,
}: {
  memberships: Membership[];
  activeBrandId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const active = memberships.find((m) => m.brandId === activeBrandId) ?? memberships[0];
  const multi = memberships.length > 1;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!active) return null;

  async function switchTo(m: Membership) {
    if (m.brandId === active!.brandId) {
      setOpen(false);
      return;
    }
    setSwitching(m.brandId);
    try {
      await auth.switchBrand(m.brandId);
      window.location.assign('/dashboard'); // fresh cookie → re-gate + re-fetch
    } catch {
      setSwitching(null);
    }
  }

  if (!multi) {
    return (
      <div className="px-1">
        <p className="truncate text-sm font-medium text-sidebar-fg">{active.brandName}</p>
        <p className="truncate text-xs text-sidebar-muted">{active.role.toLowerCase()}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-left hover:bg-sidebar-2"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-brand text-[13px] font-semibold uppercase text-brand-fg">
          {active.brandName.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-sidebar-fg">{active.brandName}</span>
          <span className="block truncate text-xs text-sidebar-muted">Switch brand</span>
        </span>
        <ChevronsUpDown />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 max-h-72 w-full overflow-auto rounded-[var(--radius)] border border-line bg-surface py-1 shadow-pop">
          {memberships.map((m) => (
            <button
              key={m.brandId}
              type="button"
              onClick={() => switchTo(m)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius)] bg-brand-soft text-[12px] font-semibold uppercase text-brand">
                {m.brandName.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-ink">{m.brandName}</span>
                <span className="block truncate text-[12px] text-muted">{m.role.toLowerCase()}</span>
              </span>
              {switching === m.brandId ? (
                <Spinner className="text-brand" />
              ) : m.brandId === active.brandId ? (
                <Check />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronsUpDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-sidebar-muted">
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
