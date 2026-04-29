import { randomBytes } from 'crypto';

/**
 * Generate a URL-safe brand slug from a company name, with random suffix
 * to avoid collisions.
 */
export function generateBrandSlug(companyName: string): string {
  const base = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const fallback = base || 'brand';
  const suffix = randomBytes(3).toString('hex').slice(0, 4);
  return `${fallback}-${suffix}`;
}
