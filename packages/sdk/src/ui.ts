const BUTTON_HOST_CLASS = 'rk-ar-button-host';

/**
 * Brand AR-button theme, as delivered by the publicAr endpoint. Every field
 * is nullable — a null means "use the Rekaman default". A brand that never
 * configured a theme has all-null and renders the standard Rekaman button.
 */
export interface BrandTheme {
  primaryColor: string | null; // hex, e.g. "#FF6B35"
  textColor: string | null;    // hex; null → SDK computes for contrast
  buttonStyle: string | null;  // 'pill' | 'rounded' | 'square'; null → 'pill'
  buttonLabel: string | null;  // overrides the per-arMode label; handled in index.ts
}

/**
 * Rekaman defaults — the SINGLE source of truth for "unthemed" appearance.
 * If we ever rebrand, only this constant changes; no brand-data backfill,
 * because the server stores null for unthemed brands and the SDK resolves
 * null → these values at render time.
 *
 * `#5A4FCF` is the Rekaman purple from the CLAUDE.md brand-identity block
 * (also the landing-site accent) — the SDK button is now consistent with it.
 */
const REKAMAN_DEFAULTS = {
  primaryColor: '#5A4FCF',
  textColor: '#FFFFFF',
  radius: '999px', // pill
};

export interface ButtonConfig {
  label?: string;
  onClick: () => void;
  /**
   * Optional secondary action — when provided, a smaller second button
   * is stacked below the primary AR button. Used for "View in 3D" alongside
   * "View in your room" (v5.21+ — interactive 3D viewer for users who can't
   * or don't want to grant camera permission).
   */
  secondary?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Optional brand theme applied at injection time. The SDK paints the
   * button before the product fetch resolves (v5.20 immediate-paint), so
   * the theme usually isn't known yet — index.ts calls `setTheme` once the
   * product lands. This field exists for any future synchronous caller.
   */
  theme?: BrandTheme | null;
}

export interface ButtonHandle {
  setLoading: (loading: boolean) => void;
  setLabel: (text: string) => void;
  setEnabled: (enabled: boolean) => void;
  setSecondaryLoading: (loading: boolean) => void;
  /** Apply (or re-apply) a brand theme. Safe to call any time post-inject. */
  setTheme: (theme: BrandTheme | null) => void;
  remove: () => void;
}

/**
 * Pick #FFFFFF or #0F0F0F for text on a given background, by WCAG contrast
 * ratio. Used when a brand sets `primaryColor` but no explicit `textColor`.
 */
function computeContrastTextColor(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return REKAMAN_DEFAULTS.textColor; // malformed → safe default
  const lin = (h: string): number => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  // WCAG relative luminance of the background.
  const L = 0.2126 * lin(m[1]!) + 0.7152 * lin(m[2]!) + 0.0722 * lin(m[3]!);
  // Contrast ratio = (lighter + 0.05) / (darker + 0.05). Compare white vs
  // near-black text and take whichever reads better.
  const vsWhite = 1.05 / (L + 0.05);
  const vsBlack = (L + 0.05) / 0.05;
  return vsWhite >= vsBlack ? '#FFFFFF' : '#0F0F0F';
}

function radiusForStyle(style: string | null | undefined): string {
  if (style === 'square') return '6px';
  if (style === 'rounded') return '14px';
  return REKAMAN_DEFAULTS.radius; // 'pill' or null/unknown
}

/**
 * Resolve a theme (with all its nulls) into concrete values and write them
 * as CSS custom properties on the shadow host. CSS variables inherit through
 * the shadow boundary, so the `<style>` block's `var(--rk-*)` references pick
 * them up. Re-callable — that's how `setTheme` works.
 */
function applyTheme(host: HTMLElement, theme: BrandTheme | null): void {
  const primary = theme?.primaryColor ?? REKAMAN_DEFAULTS.primaryColor;
  const text = theme?.textColor ?? computeContrastTextColor(primary);
  const radius = radiusForStyle(theme?.buttonStyle);
  host.style.setProperty('--rk-primary', primary);
  host.style.setProperty('--rk-text', text);
  host.style.setProperty('--rk-radius', radius);
}

export function injectButton(
  target: HTMLElement,
  config: ButtonConfig,
): ButtonHandle {
  const host = document.createElement('div');
  host.className = BUTTON_HOST_CLASS;
  host.style.cssText = 'display: inline-block; margin: 8px 0;';

  // Shadow DOM keeps the brand's CSS from leaking into our button (and vice-versa)
  const shadow = host.attachShadow({ mode: 'open' });

  // Theme is applied as CSS custom properties on the host. The `<style>`
  // below references them with `var(--rk-*, <fallback>)` so the button is
  // correct even before `applyTheme` runs.
  applyTheme(host, config.theme ?? null);

  const style = document.createElement('style');
  style.textContent = `
    .stack { display: inline-flex; flex-direction: column; gap: 8px; align-items: stretch; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      font: 600 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: var(--rk-primary, ${REKAMAN_DEFAULTS.primaryColor});
      color: var(--rk-text, ${REKAMAN_DEFAULTS.textColor});
      border: none;
      border-radius: var(--rk-radius, ${REKAMAN_DEFAULTS.radius});
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      /* Neutral drop shadow — works for any brand colour (a colour-matched
         glow would need the primary as rgb components, not worth a 4th var). */
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22); }
    .btn:active { transform: translateY(0); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    /* Secondary button — outlined in the brand colour, lighter visual weight.
       Pairs with the primary by sharing the silhouette + font, reads as a
       clearly-different choice. */
    .btn-secondary {
      background: transparent;
      color: var(--rk-primary, ${REKAMAN_DEFAULTS.primaryColor});
      box-shadow: none;
      border: 1.5px solid var(--rk-primary, ${REKAMAN_DEFAULTS.primaryColor});
      padding: 10px 22px;
      font-weight: 500;
    }
    .btn-secondary:hover {
      background: rgba(0, 0, 0, 0.05);
      transform: none;
      box-shadow: none;
    }
    .btn-secondary:disabled { opacity: 0.5; }
    .icon { width: 20px; height: 20px; display: inline-flex; align-items: center; }
    /* iOS Safari renders inline SVG at 0×0 unless explicitly sized — Chrome/Android
       infer from the flex parent but WebKit follows the spec strictly. Without these
       two rules the icon was invisible on iPhone (May 13 2026 regression). */
    .icon svg { width: 100%; height: 100%; display: block; }
    .icon svg path, .icon svg polygon, .icon svg circle { stroke: currentColor; }
    /* Spinner uses currentColor → themed automatically: white-ish on the
       filled primary button, brand-coloured on the outlined secondary. */
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  shadow.appendChild(style);

  const stack = document.createElement('div');
  stack.className = 'stack';

  const labelText = config.label ?? 'View in your room';

  const button = document.createElement('button');
  button.className = 'btn';
  button.type = 'button';
  // Screen readers + voice control: keep accessible name aligned with visible label
  button.setAttribute('aria-label', labelText);

  const icon = document.createElement('span');
  icon.className = 'icon';
  // Decorative — the button's aria-label carries the meaning
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = arIcon();

  const label = document.createElement('span');
  label.textContent = labelText;

  button.appendChild(icon);
  button.appendChild(label);
  button.addEventListener('click', config.onClick);
  stack.appendChild(button);

  // Secondary button (optional) — "View in 3D" alongside "View in your room".
  let secondaryBtn: HTMLButtonElement | null = null;
  let secondaryIcon: HTMLSpanElement | null = null;
  if (config.secondary) {
    secondaryBtn = document.createElement('button');
    secondaryBtn.className = 'btn btn-secondary';
    secondaryBtn.type = 'button';
    secondaryBtn.setAttribute('aria-label', config.secondary.label);

    secondaryIcon = document.createElement('span');
    secondaryIcon.className = 'icon';
    secondaryIcon.setAttribute('aria-hidden', 'true');
    secondaryIcon.innerHTML = cubeIcon();

    const secondaryLabel = document.createElement('span');
    secondaryLabel.textContent = config.secondary.label;

    secondaryBtn.appendChild(secondaryIcon);
    secondaryBtn.appendChild(secondaryLabel);
    secondaryBtn.addEventListener('click', config.secondary.onClick);
    stack.appendChild(secondaryBtn);
  }

  shadow.appendChild(stack);
  target.appendChild(host);

  return {
    setLoading(loading: boolean) {
      button.disabled = loading;
      button.setAttribute('aria-busy', loading ? 'true' : 'false');
      icon.innerHTML = loading ? '<div class="spinner"></div>' : arIcon();
    },
    setLabel(text: string) {
      label.textContent = text;
      button.setAttribute('aria-label', text);
    },
    setEnabled(enabled: boolean) {
      button.disabled = !enabled;
    },
    setSecondaryLoading(loading: boolean) {
      if (!secondaryBtn || !secondaryIcon) return;
      secondaryBtn.disabled = loading;
      secondaryBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
      secondaryIcon.innerHTML = loading ? '<div class="spinner"></div>' : cubeIcon();
    },
    setTheme(theme: BrandTheme | null) {
      applyTheme(host, theme);
    },
    remove() {
      host.remove();
    },
  };
}

function arIcon(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7"/>
      <path d="M3 7l9-4 9 4"/>
      <path d="M12 11v8"/>
    </svg>
  `;
}

// Isometric cube outline — matches the "Rekaman Spatial" identity (the Spatial
// Cube logo in CLAUDE.md brand identity block). Decorative icon for the
// "View in 3D" secondary button.
function cubeIcon(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>
      <path d="M12 12L4 7.5"/>
      <path d="M12 12l8-4.5"/>
      <path d="M12 12v9"/>
    </svg>
  `;
}
