'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../_components/ui';
import { auth, type MeResponse } from '../../_lib/api';

const STATS = [
  { label: 'Products', value: '—', hint: 'AR-ready models' },
  { label: 'AR sessions', value: '—', hint: 'Last 30 days' },
  { label: 'Placement rate', value: '—', hint: 'Opens that placed' },
  { label: 'Devices', value: '—', hint: 'iOS · Android · Desktop' },
];

const STEPS = [
  { title: 'Add your first product', body: 'Upload 1–4 photos; we generate the 3D model in ~90 seconds.', href: '/products' },
  { title: 'Get your API key', body: 'One key powers the embed on every product page.', href: '/api-keys' },
  { title: 'Install the snippet', body: 'One script tag + one div — or share a link/QR, no site needed.', href: '/install' },
];

export default function DashboardHome() {
  const [me, setMe] = useState<MeResponse | null>(null);
  useEffect(() => {
    auth.me().then(setMe).catch(() => {});
  }, []);
  const brand = me?.memberships[0]?.brandName;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {brand ? `Welcome, ${brand}` : 'Welcome'}
        </h1>
        <p className="mt-1 text-sm text-muted">Here’s what’s happening with your AR experiences.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[14px] text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-faint">{s.hint}</p>
          </Card>
        ))}
      </div>

      {/* Get started */}
      <div>
        <h2 className="text-sm font-semibold text-ink">Get started</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Link key={step.title} href={step.href} className="group">
              <Card className="h-full p-5 transition-colors group-hover:border-brand/40">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{step.body}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
