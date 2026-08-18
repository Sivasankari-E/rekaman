'use client';

import { useState } from 'react';
import { Button } from './ui';

/*
 * Per-product Share kit. Gives a brand a ready-to-share AR link for a product —
 * works whether or not they've embedded the SDK on a site. The link points at
 * the keyless hosted viewer (rekaman.io/s/{brand}/{slug}); shoppers who tap it
 * on a phone get AR, on desktop get a QR. Copy, WhatsApp, or the QR (for
 * packaging / Instagram / a shop counter).
 */
const SITE = 'https://rekaman.io';

export function ShareModal({
  brandSlug,
  productSlug,
  productName,
  onClose,
}: {
  brandSlug: string;
  productSlug: string;
  productName: string;
  onClose: () => void;
}) {
  const shareUrl = `${SITE}/s/${encodeURIComponent(brandSlug)}/${encodeURIComponent(productSlug)}`;
  const qrUrl = `${SITE}/qr?data=${encodeURIComponent(shareUrl)}`;
  const waText = encodeURIComponent(`See ${productName} in your room with AR 👇\n${shareUrl}`);
  const waUrl = `https://wa.me/?text=${waText}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Share this product</h2>
            <p className="mt-0.5 text-[13px] text-muted">Anyone who opens it sees AR — no app, no code.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-[var(--radius)] p-1.5 text-muted hover:bg-surface-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR */}
        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-xl border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR code for this product" width={180} height={180} />
          </div>
          <p className="mt-2 text-center text-[12.5px] text-muted">
            Print it for packaging or a shop counter — shoppers scan to view in their room.
          </p>
        </div>

        {/* Link + copy */}
        <div className="mt-5 flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate bg-transparent text-[13px] text-muted outline-none"
            aria-label="Share link"
          />
          <Button size="sm" variant="secondary" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* WhatsApp */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[#25D366] px-4 py-2.5 text-[14px] font-semibold text-white hover:brightness-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.5 14.4c-.3-.15-1.7-.83-1.95-.93-.26-.1-.45-.15-.64.15-.19.28-.73.92-.9 1.11-.16.19-.33.21-.61.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.4 1.02 2.76 1.17 2.95.15.19 2.02 3.08 4.9 4.32.68.29 1.22.47 1.63.6.69.22 1.31.19 1.8.12.55-.08 1.7-.7 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.5A10 10 0 1012 2z" />
          </svg>
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
