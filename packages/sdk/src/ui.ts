const BUTTON_HOST_CLASS = 'rk-ar-button-host';

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
}

export interface ButtonHandle {
  setLoading: (loading: boolean) => void;
  setLabel: (text: string) => void;
  setEnabled: (enabled: boolean) => void;
  setSecondaryLoading: (loading: boolean) => void;
  remove: () => void;
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
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
    .btn:active { transform: translateY(0); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    /* Secondary button — same shape, neutral colour, lighter visual weight.
       Pairs visually with the primary by sharing the rounded pill silhouette
       and font, but reads as a clearly-different choice. */
    .btn-secondary {
      background: transparent;
      color: #6366f1;
      box-shadow: none;
      border: 1.5px solid rgba(99, 102, 241, 0.3);
      padding: 10px 22px;
      font-weight: 500;
    }
    .btn-secondary:hover {
      background: rgba(99, 102, 241, 0.06);
      border-color: rgba(99, 102, 241, 0.5);
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
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white; border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .btn-secondary .spinner { border-color: rgba(99,102,241,0.3); border-top-color: #6366f1; }
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
