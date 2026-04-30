// __API_BASE__ is declared globally in src/globals.d.ts and substituted at build time.
const API_BASE = __API_BASE__;

export interface ProductData {
  id: string;
  slug: string;
  name: string;
  arMode: string;
  category: string | null;
  glbUrl: string | null;
  assets: Array<{
    type: string;
    url: string;
    metadata: Record<string, unknown> | null;
  }>;
  dimensions: {
    widthCm: number | null;
    heightCm: number | null;
    depthCm: number | null;
  };
  variants: unknown | null;
  brand: { slug: string; name: string };
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  requestId?: string;
}

export async function fetchProduct(
  apiKey: string,
  productSlug: string,
): Promise<ProductData> {
  const url = `${API_BASE}/v1/ar/${encodeURIComponent(apiKey)}/${encodeURIComponent(productSlug)}`;

  const response = await fetch(url);
  if (!response.ok) {
    // Pull error envelope so tickets like "AR isn't loading" carry the requestId
    let detail = '';
    try {
      const body: ApiErrorBody = await response.json();
      if (body.error || body.message) {
        detail = ` ${body.error ?? ''}${body.error && body.message ? ': ' : ''}${body.message ?? ''}`;
        if (body.requestId) detail += ` (requestId: ${body.requestId})`;
      }
    } catch {
      // Body wasn't JSON — fall through with status only
    }
    throw new Error(`Failed to load product (${response.status})${detail}`);
  }

  return response.json() as Promise<ProductData>;
}
