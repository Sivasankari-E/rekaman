'use client';

import { useEffect, useState } from 'react';
import { apiKeys } from '../../_lib/api';
import { Card, Input, cn } from '../../_components/ui';

const SCRIPT_TAG = '<script src="https://cdn.rekaman.io/v1/sdk.js" defer></script>';

type Tab = 'shopify' | 'woocommerce' | 'custom';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'shopify', label: 'Shopify' },
  { id: 'woocommerce', label: 'WooCommerce' },
  { id: 'custom', label: 'Custom' },
];

function divSnippet(tab: Tab, key: string): string {
  const k = key || 'rk_live_xxxxx';
  switch (tab) {
    case 'shopify':
      return `<div data-rk-product="{{ product.handle }}"\n     data-rk-key="${k}"></div>`;
    case 'woocommerce':
      return `<div data-rk-product="<?php echo $product->get_slug(); ?>"\n     data-rk-key="${k}"></div>`;
    case 'custom':
      return `<div data-rk-product="YOUR_PRODUCT_SLUG"\n     data-rk-key="${k}"></div>`;
  }
}

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-[var(--radius)] border border-line bg-sidebar px-4 py-3 font-mono text-[14px] leading-relaxed text-sidebar-fg">
        {code}
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function InstallPage() {
  const [tab, setTab] = useState<Tab>('shopify');
  const [key, setKey] = useState('');
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  useEffect(() => {
    apiKeys
      .list()
      .then((keys) => setHasKeys(keys.some((k) => !k.revokedAt)))
      .catch(() => setHasKeys(null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Install</h1>
        <p className="mt-1 text-sm text-muted">
          Add AR to your store in two lines — or share a link/QR with no website at all.
        </p>
      </div>

      {hasKeys === false && (
        <Card className="border-brand/30 bg-brand-soft p-4 text-[14px] text-ink">
          You don’t have an active API key yet. Create one on the{' '}
          <a href="/api-keys" className="font-medium text-brand hover:text-brand-hover">
            API keys
          </a>{' '}
          page, then paste it below.
        </Card>
      )}

      <Card className="p-5">
        <label className="mb-1.5 block text-[14px] font-medium text-ink">Your live API key</label>
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value.trim())}
          placeholder="rk_live_…"
          className="font-mono"
        />
        <p className="mt-1.5 text-xs text-muted">
          The snippets below update as you type. Your key is shown once when created.
        </p>
      </Card>

      {/* Embed on a store */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">1 · Embed on your store</h2>
        <p className="mt-1 text-[14px] text-muted">
          Add the script once, then a div wherever the AR button should appear.
        </p>

        <div className="mt-4 space-y-1.5">
          <p className="text-[14px] font-medium text-ink">Add once, before &lt;/body&gt;:</p>
          <CopyBlock code={SCRIPT_TAG} />
        </div>

        <div className="mt-5">
          <div className="mb-2 inline-flex rounded-[var(--radius)] border border-line p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-[7px] px-3 py-1.5 text-[14px] font-medium transition-colors',
                  tab === t.id ? 'bg-brand text-brand-fg' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <CopyBlock code={divSnippet(tab, key)} />
        </div>
      </Card>

      {/* No-website option */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">No website? Share a link or QR</h2>
        <p className="mt-1 text-[14px] text-muted">
          Every product also has a hosted page you can share on WhatsApp, Instagram, or a packaging
          QR — no site needed. Desktop shows a QR; phones open AR directly.
        </p>
        <div className="mt-3">
          <CopyBlock code={`https://rekaman.io/v/${key || 'rk_live_xxxxx'}/YOUR_PRODUCT_SLUG`} />
        </div>
      </Card>
    </div>
  );
}
