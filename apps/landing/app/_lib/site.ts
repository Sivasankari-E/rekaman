/*
 * Shared site constants + pricing data logic. Kept out of components so the
 * marketing site stays a thin composition of well-scoped pieces.
 */
export const DEMO_URL = 'https://demo.rekaman.io/';
export const ONBOARD = '/onboard';
export const FOUNDER_EMAIL = 'founder@rekaman.io';
export const WA = '918248524449';
export const WA_DISPLAY = '+91 8248 524449';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'https://api.rekaman.io';

/** Plan shape as returned by the public GET /v1/billing/plans endpoint. */
export interface ApiPlan {
  tier: string;
  displayName: string;
  amountInPaise: number;
  sessionLimit: number;
  productLimit: number;
  features: string[];
}

/** A pricing card ready to render (derived from an ApiPlan). */
export interface PricingCard {
  name: string;
  pricePrefix?: string; // "From" for the enterprise tier
  price: string; // "₹49,999"
  period: string; // "/mo"
  tagline: string;
  features: string[];
  tier: string;
  ctaLabel: string;
  ctaHref: string;
}

// Internal feature codes → display labels. Unknown codes are prettified.
const FEATURE_LABELS: Record<string, string> = {
  basic_analytics: 'Basic analytics',
  email_support: 'Email support',
  full_analytics: 'Full analytics',
  roi_calculator: 'ROI dashboard',
  shopify_app: 'Shopify app',
  white_label_sdk: 'White-label SDK',
  dedicated_support: 'Dedicated support',
  sla: 'Priority SLA',
};
const TAGLINE: Record<string, string> = {
  STARTER: 'For getting started',
  PRO: 'For brands ready to scale',
  ENTERPRISE: 'Large catalogs & custom needs',
};

// Fallback so the page never breaks if the API is unreachable at build/request time.
const FALLBACK_PLANS: ApiPlan[] = [
  { tier: 'STARTER', displayName: 'Starter', amountInPaise: 399900, sessionLimit: 500, productLimit: 10, features: ['basic_analytics', 'email_support'] },
  { tier: 'PRO', displayName: 'Pro', amountInPaise: 1299900, sessionLimit: 5000, productLimit: 50, features: ['full_analytics', 'roi_calculator', 'shopify_app'] },
  { tier: 'ENTERPRISE', displayName: 'Enterprise', amountInPaise: 4999900, sessionLimit: 999999, productLimit: 999999, features: ['white_label_sdk', 'dedicated_support', 'sla'] },
];

export async function fetchPlans(): Promise<ApiPlan[]> {
  try {
    // ISR: revalidate every 5 min so DB pricing changes reflect without a redeploy.
    const res = await fetch(`${API_BASE}/v1/billing/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return FALLBACK_PLANS;
    const data = (await res.json()) as { plans?: ApiPlan[] };
    return data.plans?.length ? data.plans : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

function featureLabel(code: string): string {
  return FEATURE_LABELS[code] ?? code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function planToCard(p: ApiPlan): PricingCard {
  const isEnterprise = p.tier === 'ENTERPRISE';
  const name = p.displayName.replace(/\s*\(monthly\)/i, '').trim();
  const unlimited = p.productLimit >= 999999;
  const limitsLine = unlimited
    ? 'Unlimited products & sessions'
    : `${p.productLimit} products · ${p.sessionLimit.toLocaleString('en-IN')} AR sessions/mo`;
  return {
    name,
    // Enterprise: show the real DB price as an anchor ("From ₹49,999") AND route
    // to Contact sales — the number tells SMBs the tier, the "From" + CTA signal
    // it's negotiable/custom.
    pricePrefix: isEnterprise ? 'From' : undefined,
    price: `₹${(p.amountInPaise / 100).toLocaleString('en-IN')}`,
    period: '/mo',
    tagline: TAGLINE[p.tier] ?? '',
    features: [limitsLine, 'AI 3D generation', ...p.features.map(featureLabel)],
    tier: p.tier,
    ctaLabel: isEnterprise ? 'Contact sales' : 'Book a demo',
    ctaHref: isEnterprise ? `mailto:${FOUNDER_EMAIL}?subject=Rekaman%20Enterprise` : ONBOARD,
  };
}
