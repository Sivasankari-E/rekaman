const BUTTON_HOST_CLASS = 'rk-ar-button-host';

export interface ButtonConfig {
  label?: string;
  onClick: () => void;
}

export interface ButtonHandle {
  setLoading: (loading: boolean) => void;
  setLabel: (text: string) => void;
  setEnabled: (enabled: boolean) => void;
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
    .icon { width: 20px; height: 20px; display: inline-flex; align-items: center; }
    /* iOS Safari renders inline SVG at 0×0 unless explicitly sized — Chrome/Android
       infer from the flex parent but WebKit follows the spec strictly. Without these
       two rules the icon was invisible on iPhone (May 13 2026 regression). */
    .icon svg { width: 100%; height: 100%; display: block; }
    .icon svg path { stroke: currentColor; }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white; border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  shadow.appendChild(style);

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
  shadow.appendChild(button);

  button.addEventListener('click', config.onClick);
  target.appendChild(host);

  return {
    setLoading(loading: boolean) {
      button.disabled = loading;
      // Keep aria-label stable; aria-busy signals the transient state instead
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
