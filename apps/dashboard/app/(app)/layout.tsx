'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '../_components/Logo';
import { ProfileMenu } from '../_components/ProfileMenu';
import { Spinner, cn } from '../_components/ui';
import { auth, type MeResponse } from '../_lib/api';

const NAV: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconGrid /> },
  { label: 'Products', href: '/products', icon: <IconBox /> },
  { label: 'API keys', href: '/api-keys', icon: <IconKey /> },
  { label: 'Analytics', href: '/analytics', icon: <IconChart /> },
  { label: 'Install', href: '/install', icon: <IconCode /> },
  { label: 'Settings', href: '/settings', icon: <IconGear /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Cookie-only auth: no readable token to pre-check. Ask the API who we are;
    // a 401 (no/invalid cookie) sends us to login.
    auth
      .me()
      .then((res) => {
        setMe(res);
        setReady(true);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  // Close the mobile drawer on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  function logout() {
    // Clear the httpOnly cookie server-side, then leave — redirect regardless
    // of the request outcome so a network blip can't trap the user signed-in.
    void auth.logout().catch(() => {});
    router.replace('/login');
  }

  if (!ready || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Spinner className="text-brand" />
      </div>
    );
  }

  const brandName = me.memberships[0]?.brandName ?? 'Your brand';

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar (desktop static, mobile drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center px-5">
          <Logo tone="onDark" size="lg" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-2 text-white'
                    : 'text-sidebar-muted hover:bg-sidebar-2 hover:text-sidebar-fg',
                )}
              >
                <span className="text-current">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-medium text-sidebar-fg">{brandName}</p>
          <p className="truncate text-xs text-sidebar-muted">{me.user.email}</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-[var(--radius)] p-2 text-ink hover:bg-surface-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu />
          </button>
          <div className="ml-auto">
            <ProfileMenu brandName={brandName} email={me.user.email} onLogout={logout} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-container flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── icons (inline, stroke-based, 20px) ──
function I({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
function IconGrid() {
  return (
    <I>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </I>
  );
}
function IconBox() {
  return (
    <I>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </I>
  );
}
function IconKey() {
  return (
    <I>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.5 12.5L21 2m-4 0l3 3m-6 3l3 3" />
    </I>
  );
}
function IconChart() {
  return (
    <I>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </I>
  );
}
function IconCode() {
  return (
    <I>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </I>
  );
}
function IconGear() {
  return (
    <I>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.31.22.65.22 1s-.08.69-.22 1z" />
    </I>
  );
}
function IconMenu() {
  return (
    <I>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </I>
  );
}
