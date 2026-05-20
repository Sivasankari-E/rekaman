import type { MetadataRoute } from 'next';

/**
 * robots.txt for rekaman.io — auto-detected by Next.js App Router and served
 * at https://rekaman.io/robots.txt.
 *
 * Phase 1 policy: allow all crawlers on all routes (the whole landing site
 * is public marketing + compliance content we WANT indexed). The `sitemap`
 * line tells Google Search Console / Bing where the sitemap lives — GSC
 * also picks it up automatically once robots.txt references it.
 *
 * When the dashboard (dashboard.rekaman.io) and demo (demo.rekaman.io) get
 * their own crawl policies, those are separate deployments with their own
 * robots files — this one only governs the apex marketing site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://rekaman.io/sitemap.xml',
    host: 'https://rekaman.io',
  };
}
