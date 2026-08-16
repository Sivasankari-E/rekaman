/*
 * Thin client for the Rekaman API. Base URL is configurable so local dev can
 * point at staging (set NEXT_PUBLIC_API_BASE in .env.local); defaults to prod.
 *
 * Auth: cookie-only. The API issues the JWT as an httpOnly `rk_auth` cookie on
 * login/signup and clears it on logout; every request here sends
 * `credentials: 'include'` so the browser attaches it. The token is NEVER
 * stored in JS-readable storage — httpOnly means an XSS payload can't exfiltrate
 * it. Client-side auth gating goes through `auth.me()` (401 → redirect to login),
 * not a readable token. CSRF is covered by the strict CORS whitelist +
 * JSON-body mutations (which force a preflight).
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'https://api.rekaman.io';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    // credentials:'include' sends the httpOnly rk_auth cookie cross-origin
    // (dashboard ↔ api). The API's CORS reflects the specific origin + sets
    // Allow-Credentials, so this is accepted.
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError('Network error — please check your connection.', 0);
  }

  const body = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; message?: string })
    | null;

  if (!res.ok) {
    const message =
      (body?.message as string) || (body?.error as string) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body?.error as string | undefined);
  }
  return body as T;
}

// ── Types (mirror server auth.types) ──

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
}
export interface AuthResponse {
  token: string;
  user: AuthUser;
  brand: { id: string; slug: string; companyName: string };
}
export interface MeResponse {
  user: AuthUser;
  memberships: Array<{ brandId: string; brandSlug: string; brandName: string; role: string }>;
  activeBrandId: string | null;
  activeRole: string | null;
}

export const auth = {
  signup: (input: { companyName: string; email: string; password: string; name?: string }) =>
    apiFetch<AuthResponse>('/v1/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: () => apiFetch<MeResponse>('/v1/auth/me', { method: 'GET' }),
  logout: () => apiFetch<{ ok: boolean }>('/v1/auth/logout', { method: 'POST' }),
  // Re-issues the auth cookie scoped to another brand the user belongs to.
  switchBrand: (brandId: string) =>
    apiFetch<AuthResponse>(`/v1/auth/switch-brand/${brandId}`, { method: 'POST' }),
};

// ── API keys ──

export interface ApiKeyListItem {
  id: string;
  prefix: string;
  name: string | null;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
/** Full key — returned ONCE, only on create. */
export interface ApiKeyCreated {
  id: string;
  key: string;
  prefix: string;
  name: string | null;
  scopes: string[];
  createdAt: string;
}

export const apiKeys = {
  list: () => apiFetch<{ keys: ApiKeyListItem[] }>('/v1/api-keys').then((r) => r.keys),
  create: (input: { name?: string }) =>
    apiFetch<{ key: ApiKeyCreated }>('/v1/api-keys', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.key),
  revoke: (id: string) => apiFetch<null>(`/v1/api-keys/${id}`, { method: 'DELETE' }),
};

// ── Brand (settings / theme) ──

export type ButtonStyle = 'pill' | 'rounded' | 'square';
export interface BrandView {
  id: string;
  slug: string;
  name: string;
  theme: {
    primaryColor: string | null;
    textColor: string | null;
    buttonStyle: ButtonStyle | null;
    buttonLabel: string | null;
  };
}
export interface ThemePatch {
  primaryColor?: string | null;
  buttonStyle?: ButtonStyle | null;
  buttonLabel?: string | null;
}

export const brand = {
  get: () => apiFetch<{ brand: BrandView }>('/v1/brands/me').then((r) => r.brand),
  updateTheme: (patch: ThemePatch) =>
    apiFetch<{ brand: BrandView }>('/v1/brands/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((r) => r.brand),
};

// ── Products ──

export type ProductStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';

export interface Product {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  arMode: string;
  category: string | null;
  glbUrl: string | null;
  usdzUrl: string | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  photoUrls: string[];
  createdAt: string;
}

export interface GenerationStatus {
  productId: string;
  status: ProductStatus;
  glbUrl: string | null;
  usdzUrl: string | null;
  generation: { reason?: string } | null;
}

export const products = {
  list: () => apiFetch<{ products: Product[] }>('/v1/products').then((r) => r.products),
  create: (input: {
    name: string;
    slug: string;
    category?: string;
    widthCm?: number;
    heightCm?: number;
    depthCm?: number;
  }) =>
    apiFetch<{ product: Product }>('/v1/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.product),
  // `config: {}` is sent so the server treats this as an explicit (re)generate —
  // required to regenerate an already-READY product (the allowFromReady rule);
  // harmless for a first generation (falls back to default generation config).
  generate: (id: string, photoUrls: string[]) =>
    apiFetch<{ status: string }>(`/v1/products/${id}/generate`, {
      method: 'POST',
      body: JSON.stringify({ photoUrls, config: {} }),
    }),
  status: (id: string) =>
    apiFetch<GenerationStatus>(`/v1/products/${id}/generation-status`, { method: 'GET' }),
};

/**
 * Upload one product image file → returns its public URL (to feed generation).
 * Multipart, so it can't use the JSON `apiFetch` (the browser must set the
 * multipart boundary itself — we only add Authorization).
 */
export async function uploadProductPhoto(productId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  let res: Response;
  try {
    // No Content-Type header — the browser sets the multipart boundary itself.
    // credentials:'include' carries the auth cookie.
    res = await fetch(`${API_BASE}/v1/products/${encodeURIComponent(productId)}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
  } catch {
    throw new ApiError('Network error while uploading.', 0);
  }
  const body = (await res.json().catch(() => null)) as
    | { url?: string; error?: string; message?: string }
    | null;
  if (!res.ok || !body?.url) {
    throw new ApiError(body?.message || body?.error || 'Upload failed.', res.status);
  }
  return body.url;
}

// ── Team ──

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface TeamMember {
  userId: string;
  name: string | null;
  email: string;
  role: Role;
  joinedAt: string;
  isYou: boolean;
}
export interface TeamInvite {
  id: string;
  email: string;
  role: Role;
  status: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}
export interface TeamView {
  members: TeamMember[];
  invitations: TeamInvite[];
}

export const team = {
  get: () => apiFetch<TeamView>('/v1/team', { method: 'GET' }),
  invite: (input: { email: string; role: 'ADMIN' | 'MEMBER' }) =>
    apiFetch<{ invitation: TeamInvite }>('/v1/team/invite', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.invitation),
  accept: (token: string) =>
    apiFetch<{ brandId: string; brandName: string; role: Role }>('/v1/team/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  setRole: (userId: string, role: Role) =>
    apiFetch<{ ok: boolean }>(`/v1/team/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  remove: (userId: string) =>
    apiFetch<{ ok: boolean }>(`/v1/team/${userId}`, { method: 'DELETE' }),
  revokeInvite: (id: string) =>
    apiFetch<{ ok: boolean }>(`/v1/team/invitations/${id}`, { method: 'DELETE' }),
};

// ── Analytics ──

export interface AnalyticsSummary {
  range: { days: number; since: string };
  totals: {
    sessions: number;
    placedSessions: number;
    placementRate: number; // 0..1
    avgDurationMs: number | null;
  };
  devices: { ios: number; android: number; desktop: number; other: number };
  sessionsByDay: Array<{ date: string; count: number }>;
  topProducts: Array<{ productId: string; name: string; slug: string; sessions: number }>;
}

export const analytics = {
  summary: (days = 30) =>
    apiFetch<AnalyticsSummary>(`/v1/analytics/summary?days=${days}`, { method: 'GET' }),
};

// ── Billing ──

export interface BillingPlan {
  id: string;
  code: string;
  tier: string;
  displayName: string;
  amountInPaise: number;
  currency: string;
  billingPeriod: string;
  sessionLimit: number;
  productLimit: number;
  features: string[];
  subscribable: boolean;
}
export interface SubscriptionView {
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}
export interface Invoice {
  id: string;
  amountInPaise: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

export const billing = {
  plans: () => apiFetch<{ plans: BillingPlan[] }>('/v1/billing/plans').then((r) => r.plans),
  subscription: () =>
    apiFetch<{ subscription: SubscriptionView | null; plan: BillingPlan | null }>(
      '/v1/billing/subscription',
    ),
  invoices: () => apiFetch<{ invoices: Invoice[] }>('/v1/billing/invoices').then((r) => r.invoices),
  subscribe: (planId: string) =>
    apiFetch<{ subscriptionId: string; shortUrl: string | null; status: string }>(
      '/v1/billing/subscribe',
      { method: 'POST', body: JSON.stringify({ planId }) },
    ),
  cancel: (atPeriodEnd = true) =>
    apiFetch<{ cancelAtPeriodEnd: boolean }>('/v1/billing/cancel', {
      method: 'POST',
      body: JSON.stringify({ atPeriodEnd }),
    }),
};

/** URL-safe slug from a product name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
