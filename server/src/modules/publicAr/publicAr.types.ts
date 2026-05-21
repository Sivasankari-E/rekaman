export interface PublicProductResponse {
  id: string;
  slug: string;
  name: string;

  // CRITICAL: arMode tells SDK which chunk to lazy-load
  arMode: string;
  category: string | null;

  glbUrl: string | null;                    // primary GLB (placement mode)
  // iOS AR Quick Look format (v5.15+ pipeline). Nullable so older products
  // (and Meshy soft-fails) gracefully fall back to GLB on iOS. SDK prefers
  // usdzUrl when present; otherwise uses glbUrl via Apple's GLB fallback
  // (which is flaky pre-iOS-17, fine on iOS 17.4+ — see CLAUDE.md v5.14).
  usdzUrl: string | null;
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
    // AR button theme. All fields nullable — the SDK falls back to Rekaman
    // defaults (purple pill) for any null. A brand that never set a theme
    // gets the standard Rekaman-branded button, zero visual regression.
    theme: {
      primaryColor: string | null;           // hex; null → Rekaman purple
      textColor: string | null;              // hex; null → SDK computes for contrast
      buttonStyle: string | null;            // 'pill' | 'rounded' | 'square'; null → 'pill'
      buttonLabel: string | null;            // null → SDK per-arMode default
    };
  };

  generatedAt: string;                       // for client-side caching
}
