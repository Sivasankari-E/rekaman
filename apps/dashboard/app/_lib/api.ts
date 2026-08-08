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
