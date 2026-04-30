export type Platform = 'webxr' | 'ios-quicklook' | 'unsupported';

export async function detectPlatform(): Promise<Platform> {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !('MSStream' in window);

  if (isIOS) {
    const a = document.createElement('a');
    return a.relList.supports('ar') ? 'ios-quicklook' : 'unsupported';
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
