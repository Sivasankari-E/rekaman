export type Platform = 'webxr' | 'ios-quicklook' | 'unsupported';

export async function detectPlatform(): Promise<Platform> {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !('MSStream' in window);

  if (isIOS) {
    // AR Quick Look is available on essentially all iOS 12+ Safari. We do NOT
    // gate on `a.relList.supports('ar')`: that check returns false negatives on
    // real iPhones (observed July 2026 — an iPhone showed no AR button because
    // relList.supports('ar') was false), and in-app webviews / iOS Chrome. If
    // AR Quick Look genuinely can't launch, the rel="ar" tap degrades quietly
    // and the always-present "View in 3D" button is the fallback.
    return 'ios-quicklook';
  }

  if ('xr' in navigator && navigator.xr) {
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (supported) return 'webxr';
    } catch {
      // Some Android browsers throw — treat as unsupported
    }
  }

  return 'unsupported';
}

export function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function detectLanguage(): string {
  return (
    navigator.language?.split('-')[0]?.toLowerCase() ?? 'en'
  );
}
