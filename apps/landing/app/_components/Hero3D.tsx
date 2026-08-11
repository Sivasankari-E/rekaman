'use client';

import { useEffect, useState, type CSSProperties } from 'react';

/*
 * Live, spinnable 3D product in the hero — an AR/3D company should demonstrate
 * its own tech on the homepage, not show a static photo. Uses Google's
 * <model-viewer>, dynamically imported (client-only, after mount) so it never
 * blocks first paint. Zoom is disabled + touch-action pan-y so it never hijacks
 * page scroll.
 */
type ModelViewerProps = {
  src: string;
  alt?: string;
  'camera-controls'?: boolean;
  'disable-zoom'?: boolean;
  'auto-rotate'?: boolean;
  'rotation-per-second'?: string;
  'auto-rotate-delay'?: string;
  'interaction-prompt'?: string;
  'shadow-intensity'?: string;
  'camera-orbit'?: string;
  'field-of-view'?: string;
  exposure?: string;
  'environment-image'?: string;
  'touch-action'?: string;
  style?: CSSProperties;
};
const ModelViewer = 'model-viewer' as unknown as React.FC<ModelViewerProps>;

const GLB =
  'https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com/brands/cmotyhdv20002uig5vxldw4g8/products/cmpmo7qh5002kdmcq2a6xfpy0/v2/model-optimized.glb';

export function Hero3D() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let ok = true;
    import('@google/model-viewer').then(() => ok && setReady(true)).catch(() => {});
    return () => {
      ok = false;
    };
  }, []);

  return (
    <div className="relative">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] blur-3xl"
        style={{ background: 'radial-gradient(50% 50% at 50% 45%, rgba(59,130,246,0.35), transparent 70%)' }}
      />
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-pop backdrop-blur-sm">
        <div className="relative aspect-[4/3] w-full">
          {ready ? (
            <ModelViewer
              src={GLB}
              alt="Florence coffee table in 3D"
              camera-controls
              disable-zoom
              auto-rotate
              rotation-per-second="18deg"
              auto-rotate-delay="0"
              interaction-prompt="none"
              shadow-intensity="0.9"
              camera-orbit="35deg 72deg auto"
              exposure="1.05"
              environment-image="neutral"
              touch-action="pan-y"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-r-transparent" />
            </div>
          )}
        </div>
        {/* caption bar */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.04] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Florence Coffee Table</p>
            <p className="text-xs text-navy-muted">Generated from photos · drag to spin</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" />
            </svg>
            View in your room
          </span>
        </div>
      </div>
    </div>
  );
}
