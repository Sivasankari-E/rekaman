import Script from 'next/script';
import { heroImage, type ArProduct } from '../_lib/hostedViewer';

/*
 * The hosted product-viewer body — shared by /v/{key}/{slug} and
 * /s/{brand}/{slug}. It drops in the Rekaman SDK embed, which injects the
 * AR / 3D buttons (and, on desktop, the "scan to continue on your phone" QR).
 * The embed identifies the product by key OR brand slug depending on the route.
 */
export function HostedViewer({
  product,
  slug,
  embedKey,
  embedBrand,
}: {
  product: ArProduct | null;
  slug: string;
  embedKey?: string;
  embedBrand?: string;
}) {
  if (!product) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Product not available</h1>
        <p className="mt-3 text-muted">This link may have expired or the product is no longer published.</p>
        <a href="https://rekaman.io" className="mt-6 text-sm font-medium text-brand">rekaman.io →</a>
      </main>
    );
  }

  const hero = heroImage(product);
  const { widthCm, heightCm, depthCm } = product.dimensions;
  const dimText =
    widthCm && heightCm ? `${widthCm} × ${heightCm}${depthCm ? ` × ${depthCm}` : ''} cm` : null;

  // Embed identifies the product by key (brand product pages) or brand slug
  // (keyless share links). The SDK reads whichever is present.
  const embedAttrs = embedKey ? { 'data-rk-key': embedKey } : { 'data-rk-brand': embedBrand };

  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-8">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {product.brand.name}
      </p>

      <div className="mt-4 aspect-square w-full overflow-hidden rounded-3xl bg-surface-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={product.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-faint">
            Tap “View in 3D” below
          </div>
        )}
      </div>

      <h1 className="mt-5 text-center text-2xl font-semibold leading-tight">{product.name}</h1>
      {dimText && <p className="mt-1 text-center text-sm text-muted">{dimText}</p>}

      {/* The Rekaman embed — the SDK injects the AR/3D buttons (+ desktop QR) */}
      <div className="mt-6 flex justify-center">
        <div data-rk-product={slug} {...embedAttrs} />
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        Tap <span className="font-medium text-ink">View in your room</span> to place it at real
        size — see if it fits before you buy.
      </p>

      <footer className="mt-12 text-center text-xs text-faint">
        Powered by{' '}
        <a href="https://rekaman.io" className="font-medium text-muted hover:text-brand">Rekaman</a>{' '}
        · Spatial commerce for any brand
      </footer>

      <Script src="https://cdn.rekaman.io/v1/sdk.js" strategy="afterInteractive" />
    </main>
  );
}
