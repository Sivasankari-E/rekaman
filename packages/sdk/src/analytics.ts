// __API_BASE__ is declared globally in src/globals.d.ts.
const EVENTS_ENDPOINT = `${__API_BASE__}/v1/events`;

interface BufferedEvent {
  sessionId: string;
  eventType: string;
  productSlug?: string;
  payload?: Record<string, unknown>;
  timestamp: number;
  arMode?: string;
  deviceType: string;
  language: string;
  userAgent: string;
  referrer?: string;
}

let buffer: BufferedEvent[] = [];
let flushTimer: number | null = null;
let apiKey: string | null = null;
let sessionId: string | null = null;
let listenersAttached = false;

const FLUSH_INTERVAL_MS = 2_000;
const MAX_BUFFER = 50;

/**
 * Idempotent — calling multiple times (e.g. one mount() per AR widget on a
 * multi-product page) does NOT regenerate the sessionId or re-attach listeners.
 * Without this guard, events from the same user session would scatter across
 * sessionIds and pagehide would flush() N times.
 */
export function initAnalytics(key: string): void {
  apiKey = key;
  if (!sessionId) sessionId = generateSessionId();

  if (!listenersAttached) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
    listenersAttached = true;
  }
}

export function getSessionId(): string {
  if (!sessionId) sessionId = generateSessionId();
  return sessionId;
}

export function track(
  eventType: string,
  options: {
    productSlug?: string;
    arMode?: string;
    payload?: Record<string, unknown>;
  } = {},
): void {
  if (!apiKey || !sessionId) return;

  buffer.push({
    sessionId,
    eventType,
    productSlug: options.productSlug,
    payload: options.payload,
    timestamp: Date.now(),
    arMode: options.arMode,
    deviceType: detectDeviceType(),
    language: detectLanguage(),
    userAgent: navigator.userAgent.slice(0, 500),
    referrer: document.referrer || undefined,
  });

  if (buffer.length >= MAX_BUFFER) {
    flush();
  } else if (flushTimer === null) {
    flushTimer = window.setTimeout(flush, FLUSH_INTERVAL_MS);
  }
}

function flush(): void {
  if (!apiKey || buffer.length === 0) return;

  const payload = JSON.stringify({ apiKey, events: buffer });
  // Snapshot now; we clear `buffer` synchronously so concurrent track() calls
  // don't get scooped into this same payload.
  buffer = [];
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  // Try sendBeacon first (most reliable on page unload).
  // sendBeacon returns false when the UA queue is full — fall back to keepalive
  // fetch so events aren't dropped silently.
  let beaconAccepted = false;
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'text/plain' });
    beaconAccepted = navigator.sendBeacon(EVENTS_ENDPOINT, blob);
  }

  if (!beaconAccepted) {
    fetch(EVENTS_ENDPOINT, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Best-effort delivery — page is likely unloading; nothing more to do
    });
  }
}

function generateSessionId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'rk-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function detectLanguage(): string {
  return navigator.language?.split('-')[0]?.toLowerCase() ?? 'en';
}
