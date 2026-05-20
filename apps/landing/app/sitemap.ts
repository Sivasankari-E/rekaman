import type { MetadataRoute } from 'next';

/**
 * Sitemap for rekaman.io — auto-detected by Next.js App Router and served
 * at https://rekaman.io/sitemap.xml.
 *
 * Covers all 5 static routes of the landing site. The canonical host is the
 * apex `rekaman.io` (no `www` — `www.rekaman.io` 308-redirects to apex per
 * the Vercel domain config), matching `metadataBase` in app/layout.tsx.
 *
 * When a new top-level route is added under app/, add it here too — the
 * sitemap does NOT auto-discover routes.
 *
 * `lastModified` is the build/deploy timestamp. Google largely re-crawls on
 * its own schedule and treats <lastmod> as a weak hint, so build-time is an
 * acceptable approximation for these rarely-changing static pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://rekaman.io';
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    // Compliance pages — rarely change, lower priority. Still indexed so the
    // DPDP / Terms / Refund pages are discoverable (also a Razorpay + trust
    // signal).
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/refund`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
