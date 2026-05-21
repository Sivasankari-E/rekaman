// __API_BASE__ is declared globally in src/globals.d.ts and substituted at build time.
const API_BASE = __API_BASE__;

export interface ProductData {
  id: string;
  slug: string;
  name: string;
  arMode: string;
  category: string | null;
  glbUrl: string | null;
  // iOS AR Quick Look format (v5.15+). Nullable for backwards-compat: older
  // products generated before the USDZ pipeline have this null, and the
  // SDK's iOS launcher falls back to glbUrl. New Meshy generations always
  // include both formats.
  usdzUrl: string | null;
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
  brand: {
    slug: string;
    name: string;
    // AR button theme (v5.22+). All fields nullable — the SDK falls back to
    // Rekaman defaults for any null. `theme` itself is optional so an older
    // API response without it is handled by optional chaining at the call site.
    theme?: {
      primaryColor: string | null;
      textColor: string | null;
      buttonStyle: string | null;
      buttonLabel: string | null;
    };
  };
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
