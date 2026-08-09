/*
 * Thin client for the Rekaman API. Base URL is configurable so local dev can
 * point at staging (set NEXT_PUBLIC_API_BASE in .env.local); defaults to prod.
 *
 * Auth: the API issues a JWT (and sets an httpOnly cookie). For this dashboard
 * scaffold we also keep the token in localStorage and send it as a Bearer
 * header — simplest correct approach for a separate-origin SPA. Hardening to
 * pure httpOnly cookies (SameSite=None + credentials) is a later step.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'https://api.rekaman.io';

const TOKEN_KEY = 'rk_token';

export const token = {
  get: (): string | null => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

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
  const t = token.get();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (t) headers.set('Authorization', `Bearer ${t}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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

/** URL-safe slug from a product name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
