'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Desktop-only QR block. On a phone the "View in your room" button works
 * directly, so this stays hidden. On a laptop/desktop (no camera-AR in the
 * browser) we show a QR of the current page URL — the shopper scans it with
 * their phone, the same viewer opens there, and AR works. This is exactly how
 * IKEA/Wayfair handle desktop.
 */
export default function DesktopQr() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Mobile devices can do AR in-page — no QR needed there.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return;

    QRCode.toDataURL(window.location.href, {
      width: 220,
      margin: 1,
      color: { dark: '#0F0F0F', light: '#FFFFFF' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, []);

  if (!dataUrl) return null;

  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-black/10 bg-white p-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR code to open this product on your phone" width={180} height={180} />
      <p className="mt-3 max-w-xs text-sm text-[#6B6B6B]">
        <span className="font-medium text-[#0F0F0F]">On a computer?</span> Scan this with your
        phone camera to place it in your room with AR.
      </p>
    </div>
  );
}
