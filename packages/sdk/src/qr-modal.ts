/*
 * Desktop "View in your room" → QR fallback.
 *
 * A laptop/desktop browser can't do camera-AR, so instead of hiding the
 * feature we show a QR of the product's hosted-viewer URL. The shopper scans
 * it with their phone, the hosted viewer opens there, and AR works — exactly
 * how IKEA / Wayfair handle desktop.
 *
 * The QR image is generated server-side (SITE/qr?data=…) so this stays tiny —
 * no QR library in the SDK bundle. Everything here is Shadow-DOM isolated so a
 * brand's page CSS can't touch it (and vice-versa).
 */

const HOST_CLASS = 'rk-qr-modal-host';

export interface QrModalOptions {
  hostedUrl: string; // the phone-friendly viewer URL the QR encodes
  productName?: string;
  primaryColor?: string; // brand accent (falls back to Rekaman blue)
}

export function showQrModal(opts: QrModalOptions): void {
  // Never stack two modals.
  document.querySelector('.' + HOST_CLASS)?.remove();

  const accent = opts.primaryColor || '#3b82f6';
  const qrSrc = `${__SITE_BASE__}/qr?data=${encodeURIComponent(opts.hostedUrl)}`;

  const host = document.createElement('div');
  host.className = HOST_CLASS;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .backdrop {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px);
      padding: 20px; animation: fade 0.18s ease;
      font: 400 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }
    @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
    .card {
      position: relative; width: 100%; max-width: 360px;
      background: #fff; border-radius: 20px; padding: 28px 28px 24px;
      text-align: center; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
      animation: pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes pop { from { transform: translateY(10px) scale(0.98); opacity: 0 } to { transform: none; opacity: 1 } }
    .close {
      position: absolute; top: 14px; right: 14px; width: 30px; height: 30px;
      border: none; border-radius: 8px; background: #f1f5f9; color: #475569;
      font-size: 18px; line-height: 1; cursor: pointer;
    }
    .close:hover { background: #e2e8f0; }
    h2 { margin: 0; font-size: 18px; font-weight: 600; color: #111827; letter-spacing: -0.01em; }
    .sub { margin: 6px 0 18px; font-size: 13.5px; color: #64748b; }
    .qr {
      width: 200px; height: 200px; margin: 0 auto; padding: 10px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
    }
    .qr img { width: 100%; height: 100%; display: block; }
    .hint { margin: 16px 0 14px; font-size: 13px; color: #475569; }
    .hint b { color: #111827; font-weight: 600; }
    .link {
      display: flex; align-items: center; gap: 8px;
      border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px;
    }
    .link input {
      flex: 1; min-width: 0; border: none; outline: none; background: transparent;
      font-size: 12px; color: #64748b;
    }
    .copy {
      border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer;
      font-size: 12.5px; font-weight: 600; color: #fff; background: ${accent};
    }
    .copy:hover { filter: brightness(0.95); }
    .powered { margin-top: 14px; font-size: 11px; color: #94a3b8; }
  `;
  shadow.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.innerHTML = `
    <div class="card">
      <button class="close" aria-label="Close">&times;</button>
      <h2>View it in your room</h2>
      <p class="sub">${opts.productName ? escapeHtml(opts.productName) : 'AR works best on your phone'}</p>
      <div class="qr"><img src="${qrSrc}" alt="Scan to open on your phone" /></div>
      <p class="hint"><b>Scan with your phone’s camera</b> to place it in your room with AR.</p>
      <div class="link">
        <input type="text" readonly value="${escapeAttr(opts.hostedUrl)}" aria-label="Product link" />
        <button class="copy" type="button">Copy</button>
      </div>
      <p class="powered">Powered by Rekaman</p>
    </div>
  `;
  shadow.appendChild(backdrop);
  document.body.appendChild(host);

  const close = () => {
    document.removeEventListener('keydown', onKey);
    host.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close(); // click outside the card
  });
  shadow.querySelector('.close')?.addEventListener('click', close);

  const input = shadow.querySelector<HTMLInputElement>('.link input');
  const copyBtn = shadow.querySelector<HTMLButtonElement>('.copy');
  copyBtn?.addEventListener('click', () => {
    const link = input?.value ?? opts.hostedUrl;
    void navigator.clipboard?.writeText(link).then(
      () => {
        copyBtn.textContent = 'Copied';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
      },
      () => {
        input?.select();
      },
    );
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
