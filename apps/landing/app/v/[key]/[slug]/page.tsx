import type { Metadata } from 'next';
import Script from 'next/script';
import DesktopQr from './DesktopQr';

/**
 * Rekaman hosted viewer — rekaman.io/v/{apiKey}/{productSlug}
 *
 * A zero-integration product page for brands that have no website (WhatsApp
 * Business catalog, Instagram shop, Linktree, packaging QR) and a desktop-QR
 * fallback for brands that do. It reuses the SAME public AR endpoint + SDK the
 * `<div data-rk-*>` embed uses — the page just fetches the product for a hero
 * image + rich link preview, and drops in the SDK, which injects the AR/3D
 * buttons. The apiKey is already public (it lives in the SDK embed attribute),
 * so exposing it in the URL is consistent with existing behaviour.
 *
 * SSR + generateMetadata give WhatsApp/Instagram/iMessage a real title +
 * product image in the link preview — critical for India's share-first,
 * WhatsApp-native commerce.
 */

const API_BASE = 'https://api.rekaman.io';

interface ArProduct {
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  photoUrls: string[];
  dimensions: { widthCm: number | null; heightCm: number | null; depthCm: number | null };
  brand: { name: string };
}

async function getProduct(key: string, slug: string): Promise<ArProduct | null> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/ar/${encodeURIComponent(key)}/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as ArProduct;
  } catch {
    return null;
  }
}

function heroImage(p: ArProduct): string | null {
  return p.photoUrls?.[0] ?? p.thumbnailUrl ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: { key: string; slug: string };
}): Promise<Metadata> {
  const p = await getProduct(params.key, params.slug);
  if (!p) {
    return { title: 'Product not found', robots: { index: false } };
  }
  const img = heroImage(p);
  const title = `${p.name} — view in your room`;
  const description = `See ${p.name} from ${p.brand.name} in your own room at real size, in AR. No app needed.`;
  return {
    title,
    description,
    robots: { index: false }, // per-product viewer pages aren't for SEO indexing
    openGraph: {
      title: p.name,
      description,
      type: 'website',
      images: img ? [{ url: img }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: p.name,
      description,
      images: img ? [img] : [],
    },
  };
}

export default async function ViewerPage({
  params,
}: {
  params: { key: string; slug: string };
}) {
  const p = await getProduct(params.key, params.slug);

  if (!p) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Product not available</h1>
        <p className="mt-3 text-muted">
          This link may have expired or the product is no longer published.
        </p>
        <a href="https://rekaman.io" className="mt-6 text-sm font-medium text-brand">
          rekaman.io →
        </a>
      </main>
    );
  }

  const hero = heroImage(p);
  const dims = p.dimensions;
  const dimText =
    dims.widthCm && dims.heightCm
      ? `${dims.widthCm} × ${dims.heightCm}${dims.depthCm ? ` × ${dims.depthCm}` : ''} cm`
      : null;

  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-8">
      {/* Brand line */}
      <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {p.brand.name}
      </p>

      {/* Hero */}
      <div className="mt-4 aspect-square w-full overflow-hidden rounded-3xl bg-surface-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={p.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-faint">
            Tap “View in 3D” below
          </div>
        )}
      </div>

      {/* Title + meta */}
      <h1 className="mt-5 text-center text-2xl font-semibold leading-tight">
        {p.name}
      </h1>
      {dimText && <p className="mt-1 text-center text-sm text-muted">{dimText}</p>}

      {/* The Rekaman embed — the SDK scans for this and injects the AR/3D buttons */}
      <div className="mt-6 flex justify-center">
        <div data-rk-product={params.slug} data-rk-key={params.key} />
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        Tap <span className="font-medium text-ink">View in your room</span> to place it at
        real size — see if it fits before you buy.
      </p>

      {/* Desktop-only QR (scan → open on phone → AR) */}
      <DesktopQr />

      {/* Attribution */}
      <footer className="mt-12 text-center text-xs text-faint">
        Powered by{' '}
        <a href="https://rekaman.io" className="font-medium text-muted hover:text-brand">
          Rekaman
        </a>{' '}
        · Spatial commerce for any brand
      </footer>

      <Script src="https://cdn.rekaman.io/v1/sdk.js" strategy="afterInteractive" />
    </main>
  );
}
