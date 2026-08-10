'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Spinner } from './ui';

/**
 * In-dashboard 3D preview. Brand owners can't open a raw .glb, so we render it
 * with Google's <model-viewer> (orbit / zoom / AR) right here. The heavy library
 * (three.js inside) is DYNAMICALLY imported only when the modal opens, so it
 * never weighs down the rest of the dashboard.
 */

// `<model-viewer>` is a custom element — typed as an FC so JSX is happy without
// augmenting the global JSX namespace.
type ModelViewerProps = {
  src: string;
  alt?: string;
  'camera-controls'?: boolean;
  'auto-rotate'?: boolean;
  'shadow-intensity'?: string;
  exposure?: string;
  ar?: boolean;
  'ar-modes'?: string;
  'touch-action'?: string;
  style?: CSSProperties;
};
const ModelViewer = 'model-viewer' as unknown as React.FC<ModelViewerProps>;

export function Model3DModal({
  glbUrl,
  name,
  onClose,
}: {
  glbUrl: string;
  name: string;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Registers the <model-viewer> custom element.
    import('@google/model-viewer')
      .then(() => mounted && setReady(true))
      .catch(() => mounted && setReady(true)); // still render; element may already be defined
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      mounted = false;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-muted hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1 bg-gradient-to-b from-surface to-surface-2">
          {ready ? (
            <ModelViewer
              src={glbUrl}
              alt={name}
              camera-controls
              auto-rotate
              shadow-intensity="1"
              exposure="1"
              ar
              ar-modes="webxr scene-viewer quick-look"
              touch-action="pan-y"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Spinner className="text-brand" />
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-2 text-center text-xs text-muted">
          Drag to rotate · scroll to zoom
        </div>
      </div>
    </div>
  );
}
