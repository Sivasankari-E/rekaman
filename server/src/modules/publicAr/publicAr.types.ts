export interface PublicProductResponse {
  id: string;
  slug: string;
  name: string;

  // CRITICAL: arMode tells SDK which chunk to lazy-load
  arMode: string;
  category: string | null;

  glbUrl: string | null;                    // primary GLB (placement mode)
  assets: Array<{                            // multi-asset products (Phase 3+)
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
  };

  generatedAt: string;                       // for client-side caching
}
