import type { Metadata } from 'next';

/*
 * Shared data + metadata logic for the Rekaman hosted viewer, used by both
 * routes:
 *   /v/{apiKey}/{slug}  — keyed (built by the SDK's desktop-QR fallback)
 *   /s/{brandSlug}/{slug} — keyless (built by the dashboard Share kit)
 * Both render the same <HostedViewer> and hit the same public AR endpoint.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'https://api.rekaman.io';

export interface ArProduct {
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  photoUrls: string[];
  dimensions: { widthCm: number | null; heightCm: number | null; depthCm: number | null };
  brand: { name: string };
}

async function fetchAr(path: string): Promise<ArProduct | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as ArProduct;
  } catch {
    return null;
  }
}

export const fetchArByKey = (key: string, slug: string) =>
  fetchAr(`/v1/ar/${encodeURIComponent(key)}/${encodeURIComponent(slug)}`);

export const fetchArByBrand = (brand: string, slug: string) =>
  fetchAr(`/v1/ar/b/${encodeURIComponent(brand)}/${encodeURIComponent(slug)}`);

export function heroImage(p: ArProduct): string | null {
  return p.photoUrls?.[0] ?? p.thumbnailUrl ?? null;
}

/** Rich link preview (WhatsApp/Instagram/iMessage) — India's share-first commerce. */
export function buildMetadata(p: ArProduct | null): Metadata {
  if (!p) return { title: 'Product not found', robots: { index: false } };
  const img = heroImage(p);
  const description = `See ${p.name} from ${p.brand.name} in your own room at real size, in AR. No app needed.`;
  return {
    title: `${p.name} — view in your room`,
    description,
    robots: { index: false }, // per-product viewer pages aren't for SEO
    openGraph: { title: p.name, description, type: 'website', images: img ? [{ url: img }] : [] },
    twitter: {
      card: 'summary_large_image',
      title: p.name,
      description,
      images: img ? [img] : [],
    },
  };
}
